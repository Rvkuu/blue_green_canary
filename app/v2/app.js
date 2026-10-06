const express = require('express');
const { performance } = require('node:perf_hooks');
const { generateShortCode } = require('./lib/code-generator');
const {
  createLink,
  incrementClickCount,
  listLinks
} = require('./lib/link-store');

const CODE_GENERATION_ATTEMPTS = 5;

function getPublicOrigin(publicBaseUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(publicBaseUrl);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be a valid HTTP or HTTPS origin');
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error('PUBLIC_BASE_URL must be a valid HTTP or HTTPS origin');
  }

  return parsedUrl.origin;
}

function isValidDestinationUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    return false;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    return false;
  }

  return ['http:', 'https:'].includes(parsedUrl.protocol) && parsedUrl.hostname.length > 0;
}

function sendError(response, status, code, message) {
  return response.status(status).json({
    error: { code, message }
  });
}

function toPublicLink(link, publicOrigin) {
  return {
    code: link.code,
    shortUrl: `${publicOrigin}/${link.code}`,
    destinationUrl: link.destinationUrl,
    clickCount: link.clickCount
  };
}

function createApp({
  database,
  publicBaseUrl,
  version = 'v1',
  generateCode = generateShortCode,
  requestLogger = console.log
}) {
  if (!database) {
    throw new TypeError('A database connection is required');
  }
  if (typeof requestLogger !== 'function') {
    throw new TypeError('A request logger function is required');
  }

  const publicOrigin = getPublicOrigin(publicBaseUrl);
  const app = express();
  let requestCount = 0;

  app.use((request, response, next) => {
    requestCount += 1;
    const currentRequestCount = requestCount;
    const startedAt = performance.now();

    response.once('finish', () => {
      requestLogger(JSON.stringify({
        event: 'http_request',
        version,
        requestCount: currentRequestCount,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt)
      }));
    });

    next();
  });
  app.use(express.json({ strict: false }));

  app.get('/health', (_request, response) => {
    database.prepare('SELECT 1').get();
    response.status(200).json({ status: 'healthy', version });
  });

  app.post('/api/links', (request, response) => {
    const destinationUrl = request.body?.url;
    if (!isValidDestinationUrl(destinationUrl)) {
      return sendError(
        response,
        400,
        'INVALID_URL',
        'url must be a valid HTTP or HTTPS URL'
      );
    }

    let createdCode;
    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = generateCode();
      if (createLink(database, { code, destinationUrl })) {
        createdCode = code;
        break;
      }
    }

    if (!createdCode) {
      throw new Error(
        `Could not generate a unique short code after ${CODE_GENERATION_ATTEMPTS} attempts`
      );
    }

    const link = {
      code: createdCode,
      destinationUrl,
      clickCount: 0
    };

    return response
      .status(201)
      .json(toPublicLink(link, publicOrigin));
  });

  app.get('/api/links', (request, response) => {
    const sort = request.query.sort;
    if (sort !== undefined && sort !== 'clicks') {
      return sendError(
        response,
        400,
        'INVALID_SORT',
        'sort must be "clicks" when provided'
      );
    }

    const links = listLinks(database, {
      sortByClickCount: sort === 'clicks'
    }).map((link) => toPublicLink(link, publicOrigin));
    response.status(200).json({ links });
  });

  app.get('/:code', (request, response) => {
    const destinationUrl = incrementClickCount(database, request.params.code);
    if (!destinationUrl) {
      return sendError(
        response,
        404,
        'LINK_NOT_FOUND',
        'No link found for this code'
      );
    }

    return response.redirect(302, destinationUrl);
  });

  app.use((_request, response) => {
    sendError(response, 404, 'NOT_FOUND', 'Resource not found');
  });

  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (error.type === 'entity.parse.failed') {
      return sendError(
        response,
        400,
        'INVALID_JSON',
        'Request body must be valid JSON'
      );
    }

    console.error(error);
    return sendError(
      response,
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred'
    );
  });

  return app;
}

module.exports = { createApp };
