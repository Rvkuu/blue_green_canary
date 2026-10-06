# URL Shortener Learning Lab

This repository is a step-by-step learning project. v1 is the URL-shortener
MVP; v2 introduces click-count sorting as the first canary feature. Changes
are committed and pushed to the selected branch; this lab does not use pull
requests.

The MVP is an API-only Node.js service using Express and SQLite. Docker Compose
runs the app, its explicit database migration step, and an Nginx reverse proxy.

## Development setup

- Windows prerequisites: [docs/development-environment.md](docs/development-environment.md)
- Step-by-step development workflow: [docs/contributing.md](docs/contributing.md)
- Product requirements: [docs/product-requirements.md](docs/product-requirements.md)
- Architecture decisions: [docs/decisions/](docs/decisions/)

Both app versions and their tests require Node.js 24 or newer. Run the test
suites with:

```powershell
npm ci --prefix app/v1
npm test --prefix app/v1
npm ci --prefix app/v2
npm test --prefix app/v2
```

## Run the MVP

From the repository root, start the stack:

```powershell
docker compose up --build
```

Compose runs the one-shot SQLite migration service, then starts v1 and v2
against the same database volume. Nginx starts after both versions are healthy
and initially sends approximately 95% of requests to v1 and 5% to v2.
Already-applied migrations are skipped. The named `links-data` volume stores
the database so application container restarts do not erase links or click
counts.

The public API is available at `http://localhost:8080`:

| Request | Behavior |
| --- | --- |
| `POST /api/links` | Create a short link from a JSON `url` |
| `GET /api/links` | List short links and click counts in code order |
| `GET /api/links?sort=clicks` | v2 sorts by clicks descending, then code ascending |
| `GET /:code` | Redirect to the saved destination with HTTP 302 |
| `GET /health` | Check the health of the version selected by Nginx |

The versions can also be called directly for comparison:

- v1 API and health: `http://localhost:3001`
- v2 API and health: `http://localhost:3002`

Create a link in PowerShell:

```powershell
$link = Invoke-RestMethod `
  -Uri http://localhost:8080/api/links `
  -Method Post `
  -ContentType 'application/json' `
  -Body (@{ url = 'https://example.com' } | ConvertTo-Json)
$link
```

List links:

```powershell
Invoke-RestMethod http://localhost:8080/api/links
```

Inspect a redirect response without following it:

```powershell
curl.exe -i "http://localhost:8080/$($link.code)"
```

Check service and migration status:

```powershell
docker compose ps
docker compose logs migrate
docker compose logs v1
docker compose logs v2
```

Each completed request is written to the receiving version's container log as
a JSON record with the version, process-local request number, method, path,
status, and duration. Follow both logs while making API requests:

```powershell
docker compose logs --follow v1 v2
```

Request numbers reset when their app container restarts. They are separate
from `clickCount`, which counts only successful short-link redirects and is
stored in SQLite.

## Canary rollout

The v2 feature is optional and additive. Requests without `sort` keep the
existing code-ascending order on both versions. v1 ignores the recognized
`sort=clicks` parameter; v2 sorts by click count descending and breaks ties by
code ascending. Therefore, during a canary, a sorted response depends on which
version Nginx selects. Inspect each version's logs and responses.

To change the canary percentage, edit the Nginx upstream weights in
`nginx/nginx.conf`, then rebuild/recreate Nginx:

| v1 weight | v2 weight | Approximate v2 traffic |
| ---: | ---: | ---: |
| 95 | 5 | 5% |
| 80 | 20 | 20% |
| 50 | 50 | 50% |
| remove v1 | 100 | 100% |

For example, set:

```nginx
upstream app_backend {
  server v1:3001 weight=80;
  server v2:3002 weight=20;
}
```

Then apply that stage:

```powershell
docker compose up -d --build nginx
```

Weighted round-robin is approximate over a finite number of requests. Send
many requests and compare version-tagged application logs before treating the
observed split as representative. The four weight stages are practice steps,
not automatic promotion based on production-grade metrics.

To roll back, restore the upstream to only v1 and rebuild Nginx:

```nginx
upstream app_backend {
  server v1:3001;
}
```

This switches new requests back to v1; it does not undo database changes. The
click-sorting release has no schema changes, so no database rollback is
needed.

Stop the services:

```powershell
docker compose down
```

`docker compose down` preserves the named data volume. To intentionally erase
the local database and all saved links, run `docker compose down --volumes`.

## Release sequence

- **v1 MVP:** provides URL creation, redirects, listing, persistent click
  counts, health, and request logs.
- **v2 canary:** adds optional click-count sorting, shares the compatible v1
  schema, and begins at 5% of proxy traffic.

The open-source Nginx configuration does not actively poll the app's
`/health` endpoints. Compose uses them for container health and startup
ordering. Nginx uses passive failure handling; active Nginx upstream health
checks require a different approach, such as NGINX Plus.

This is a learning lab, not a production-ready public URL-shortening service.
