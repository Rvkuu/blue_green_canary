# ADR 0004: Initial JSON API contract


## Context

The MVP is an API-only URL shortener. Agreeing on routes, payloads, and
responses before implementation gives clients and tests a stable behavior to
target. The service will run behind Nginx and may also be accessed directly
during development.

## Decision

Use these endpoints:

### Create a link

`POST /api/links`

Request:

```json
{
  "url": "https://example.com"
}
```

Success: HTTP `201 Created`

```json
{
  "code": "a1B2c3D4",
  "shortUrl": "http://localhost:8080/a1B2c3D4",
  "destinationUrl": "https://example.com",
  "clickCount": 0
}
```

The code shown illustrates the agreed eight-character format; it is an example
only, not a guaranteed generated value.

The `shortUrl` origin is the configured `PUBLIC_BASE_URL`. The local
development value will be `http://localhost:8080`; deployed environments set
their own externally reachable origin. Do not build the returned URL from an
untrusted incoming Host header.

### List links

`GET /api/links`

Success: HTTP `200 OK`

```json
{
  "links": [
    {
      "code": "a1B2c3D4",
      "shortUrl": "http://localhost:8080/a1B2c3D4",
      "destinationUrl": "https://example.com",
      "clickCount": 0
    }
  ]
}
```

When no links exist, `links` is an empty array.

### Resolve a code

`GET /:code`

For a known code, respond with HTTP `302 Found` and a `Location` header
containing the destination URL. Each successful redirect increments its click
count exactly once. An unknown code responds with HTTP `404 Not Found`.
Application API and health routes take precedence over this route, and codes
must not shadow reserved paths such as `/api/links` or `/health`.

### Errors

Requests use `Content-Type: application/json`; the `url` field is required
and must be a non-empty string containing a well-formed HTTP or HTTPS URL.
Invalid JSON or an invalid request responds with HTTP `400 Bad Request`.
Unknown codes respond with HTTP `404 Not Found`. Both use the same JSON error
shape:

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "url must be a valid HTTP or HTTPS URL"
  }
}
```

For an unknown code, the error code is `LINK_NOT_FOUND` and the message is
`No link found for this code`. Error codes are stable machine-readable
identifiers; messages are human-readable.

## Alternatives considered

- **Derive the origin from the incoming Host header:** convenient behind a
  proxy, but makes generated links depend on request headers and proxy trust
  configuration.
- **Return only a relative short path:** avoids an origin setting, but requires
  each client to construct the usable URL.
- **Use different response shapes for each error:** rejected because one
  predictable shape is easier for callers and tests.

## Consequences

- Clients and automated tests can rely on an explicit request and response
  contract.
- `PUBLIC_BASE_URL` must be configured consistently with the public Nginx
  address in each environment.
- See [`0005-short-code-generation.md`](0005-short-code-generation.md) for the
  code format and collision-handling decision.
- The list endpoint is public in the unauthenticated MVP and may reveal
  destinations; the service is a learning project, not a public production
  service.
