const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { once } = require('node:events');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createApp } = require('../app');
const { migrateDatabase, openDatabase } = require('../lib/database');
const { createLink } = require('../lib/link-store');

let temporaryDirectory;
let database;
let server;
let baseUrl;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'url-shortener-api-test-'));
  const databasePath = join(temporaryDirectory, 'links.sqlite');
  migrateDatabase(databasePath);
  database = openDatabase(databasePath);
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server = undefined;
  }
  if (database) {
    database.close();
    database = undefined;
  }
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

async function startServer(options = {}) {
  const app = createApp({
    database,
    publicBaseUrl: 'https://short.example',
    requestLogger: () => {},
    ...options
  });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function postLink(body, headers = {}) {
  return fetch(`${baseUrl}/api/links`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

test('creates and lists links using the configured public origin', async () => {
  await startServer();

  const createResponse = await postLink(
    { url: 'https://example.com' },
    { host: 'attacker.example' }
  );
  assert.equal(createResponse.status, 201);
  const createdLink = await createResponse.json();
  assert.match(createdLink.code, /^[A-Za-z0-9]{8}$/);
  assert.equal(createdLink.shortUrl, `https://short.example/${createdLink.code}`);
  assert.equal(createdLink.destinationUrl, 'https://example.com');
  assert.equal(createdLink.clickCount, 0);

  const listResponse = await fetch(`${baseUrl}/api/links`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), { links: [createdLink] });
});

test('returns a consistent JSON error for invalid URL input', async () => {
  await startServer();

  for (const body of [42, {}, { url: '' }, { url: 42 }, { url: 'not-a-url' }, { url: 'ftp://example.com' }]) {
    const response = await postLink(body);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INVALID_URL',
        message: 'url must be a valid HTTP or HTTPS URL'
      }
    });
  }

  assert.deepEqual(await (await fetch(`${baseUrl}/api/links`)).json(), { links: [] });
});

test('returns a JSON error for malformed JSON', async () => {
  await startServer();

  const response = await fetch(`${baseUrl}/api/links`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid'
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: 'INVALID_JSON',
      message: 'Request body must be valid JSON'
    }
  });
});

test('redirects known codes and increments the click count once', async () => {
  await startServer();
  const createResponse = await postLink({ url: 'https://example.com/path' });
  const createdLink = await createResponse.json();

  const redirectResponse = await fetch(`${baseUrl}/${createdLink.code}`, {
    redirect: 'manual'
  });

  assert.equal(redirectResponse.status, 302);
  assert.equal(redirectResponse.headers.get('location'), 'https://example.com/path');
  const listResponse = await fetch(`${baseUrl}/api/links`);
  const listedLinks = await listResponse.json();
  assert.equal(listedLinks.links[0].clickCount, 1);
});

test('returns a JSON 404 for an unknown code without counting a click', async () => {
  await startServer();

  const response = await fetch(`${baseUrl}/missing1`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: 'LINK_NOT_FOUND',
      message: 'No link found for this code'
    }
  });
});

test('retries a generated code that already exists', async () => {
  createLink(database, {
    code: 'Ab12Cd34',
    destinationUrl: 'https://existing.example'
  });
  const codes = ['Ab12Cd34', 'Zx98Yt76'];
  await startServer({ generateCode: () => codes.shift() });

  const response = await postLink({ url: 'https://new.example' });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).code, 'Zx98Yt76');
});

test('keeps the health endpoint distinct from short-code resolution', async () => {
  await startServer();

  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'healthy', version: 'v1' });
});

test('logs each completed request with a per-version count and response timing', async () => {
  const requestLogs = [];
  await startServer({ requestLogger: (line) => requestLogs.push(JSON.parse(line)) });

  const invalidResponse = await postLink({ url: 'ftp://example.com' });
  await invalidResponse.json();
  const healthResponse = await fetch(`${baseUrl}/health`);
  await healthResponse.json();

  assert.equal(requestLogs.length, 2);
  assert.deepEqual(requestLogs.map(({ version, requestCount, method, path, statusCode }) => ({
    version,
    requestCount,
    method,
    path,
    statusCode
  })), [
    {
      version: 'v1',
      requestCount: 1,
      method: 'POST',
      path: '/api/links',
      statusCode: 400
    },
    {
      version: 'v1',
      requestCount: 2,
      method: 'GET',
      path: '/health',
      statusCode: 200
    }
  ]);
  assert.ok(requestLogs.every(({ durationMs }) =>
    Number.isInteger(durationMs) && durationMs >= 0
  ));
});
