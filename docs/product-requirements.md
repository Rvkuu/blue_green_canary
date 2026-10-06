# URL Shortener — Product Requirements

## Purpose

Build a small URL-shortening service as a learning project. Develop it in
incremental, reviewable steps and use the existing Docker, Nginx, and
blue/green-canary setup to demonstrate releasing and rolling back changes.

## MVP

An unauthenticated user can use a JSON API to:

1. Submit a destination URL and receive a short URL with a system-generated
   code.
2. Visit the short URL and be redirected to its destination.
3. View the list of shortened URLs and their click counts.

Links and click counts must survive application restarts and container
recreation.

## Out of scope for the MVP

- User accounts, ownership, and access control.
- User-chosen aliases.
- Link expiration, editing, or deletion.
- Advanced or unique-visitor analytics.
- Production-grade abuse prevention and service-level guarantees.

These can be considered later as explicit, separately scoped changes.

## Acceptance criteria

- `POST /api/links` accepts a JSON body containing a `url` string and creates
  a shortened link. The `url` must be a non-empty string containing a
  well-formed HTTP or HTTPS URL.
- A successful create responds with HTTP `201 Created` and a JSON object
  containing `code`, `shortUrl`, `destinationUrl`, and `clickCount`.
- `shortUrl` is an absolute URL formed from the configured `PUBLIC_BASE_URL`
  and the generated code.
- `GET /api/links` responds with HTTP `200 OK` and a JSON object containing
  the list of links and their click counts.
- `GET /:code` redirects to the destination with HTTP `302 Found`.
- A valid destination can be shortened and the returned short URL resolves to
  that destination with an HTTP 302 Found response.
- Invalid JSON or URL input, including destinations that do not use HTTP or
  HTTPS, responds with HTTP `400 Bad Request` and a JSON error object; no link
  is created.
- An unknown short code responds with HTTP `404 Not Found` and a JSON error
  object.
- API and health routes take precedence over short-code resolution; codes
  cannot shadow reserved routes.
- Every successful redirect request increments the stored click count once.
- The link list reports each stored link and its click count.
- Stored links and counts remain available after restarting the application
  containers.
- Both app versions expose a health endpoint, and Nginx routes traffic between
  them for the canary.
- Each HTTP request is logged with its app version, per-process request number,
  method, path, response status, and duration.
- Compose probes both `/health` endpoints and waits for both versions to
  become healthy before starting Nginx.
- v2 adds optional `GET /api/links?sort=clicks`, ordering links by click count
  descending and breaking ties by code ascending. Without `sort`, v2 preserves
  the existing code-ascending order.
- Unsupported or repeated `sort` parameters on v2 respond with HTTP `400 Bad
  Request` and a JSON error; v1 continues to ignore query parameters it does
  not recognize.
- Docker Compose runs both versions against the same SQLite volume and starts
  Nginx only after both health checks pass.
- v2 is a separately built snapshot of v1; both versions use the same schema
  and share persisted links and click counts.
- Nginx's initial canary split routes approximately 95% to v1 and 5% to v2.
- The canary exercise increases v2's weight through 5%, 20%, 50%, and 100%,
  checking behavior and version-tagged request logs at each stage.
- Automated tests cover the core create, list, and redirect behavior.

## Agreed design choices

- The first project is a URL shortener with basic click analytics.
- The MVP is delivered in v1 first; v2 is built separately from the v1
  baseline after v1 is complete and verified.
- The MVP has no user accounts.
- Codes are system-generated, random, and eight characters long; custom aliases
  are not part of the MVP.
- The MVP is API-only; a browser interface is out of scope.
- v2's only API change is optional `GET /api/links?sort=clicks`, with a
  deterministic click-count-descending, code-ascending tie-break order.
- v2 rejects unsupported or repeated `sort` query parameters with
  `400 Bad Request`; v1 ignores unrecognized query parameters.
- Creation and listing use `POST /api/links` and `GET /api/links`;
  `GET /:code` resolves a short code.
- The create request body is `{"url":"https://example.com"}`.
- Requests use `Content-Type: application/json`; `url` is required and must be
  a non-empty string.
- Create and list responses are JSON. Create returns a link object; list
  returns `{"links":[...]}`. Errors use a JSON `error` object with a stable
  code and a human-readable message.
- The absolute short URL is built from the configured `PUBLIC_BASE_URL`, not
  from the incoming request's Host header.
- Codes use a case-sensitive alphanumeric alphabet; storage enforces
  uniqueness, and code collisions are retried.
- Each successful redirect request counts as one click; visitors are not
  deduplicated.
- Only HTTP and HTTPS destinations are accepted.
- Short links use HTTP 302 Found redirects.
- SQLite is the persistence store, backed by a Docker volume.
- The application uses Node.js's built-in `node:sqlite`; container runtimes
  will be upgraded to Node.js 24.
- Database schema changes are applied through versioned SQL migrations, run
  explicitly before deploying application changes.
- The local Compose stack runs the migration as a one-shot service before v1.
- Request counts are process-local diagnostic counters included in each
  structured request log; they reset when that app container restarts.
- Nginx does not actively probe the application `/health` endpoints. Compose
  gates startup on both versions being healthy; ongoing active health-based
  traffic removal is not provided by open-source Nginx.
- For valid `sort=clicks` requests, v1 ignores the optional parameter and
  returns the default ordering, while v2 applies click sorting.
- The initial link record stores a unique short code, its destination URL, and
  a non-negative click count that starts at zero.
- Automated tests use Node.js's built-in `node:test` runner and strict
  assertions, without a third-party test framework for the MVP.

The rationale and trade-offs for these choices are recorded in
[`decisions/`](decisions/).

## Still to decide before later releases

- Criteria and metrics for promoting the canary between traffic weights.

## Working agreements

- Agree on behavior before implementing each layer.
- Set up and verify the development tools before starting implementation; see
  [`development-environment.md`](development-environment.md).
- Work in focused branches, review completed steps, then commit and push them
  directly to the selected branch; see [`contributing.md`](contributing.md).
- Deliver the MVP in v1 first; make v2 a separate follow-up change after v1 is
  complete and verified.
- Record meaningful architecture and product decisions as short decision
  records, including context, alternatives, and consequences.
- Make focused commits that represent completed steps; run the relevant checks
  before committing.
- Keep the README aligned with the actual setup and workflow.
