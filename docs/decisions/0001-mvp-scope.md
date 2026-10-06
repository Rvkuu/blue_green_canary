# ADR 0001: URL shortener MVP scope


## Context

The existing repository is a deployment-strategy lab. It needs a small product
whose behavior is easy to observe while exercising API design, persistence,
testing, CI, canary rollout, and rollback.

## Decision

Build a URL shortener with basic click analytics. The MVP lets unauthenticated
users use a JSON API to create links using randomly generated codes, follow
those links, and view the link list with click counts. Count every successful
redirect request as one click; do not deduplicate visitors. User accounts,
custom aliases, and a browser interface are excluded. Only HTTP and HTTPS
destination URLs are accepted. Create and list links at `/api/links`; resolve
codes at `/:code`. Short links return HTTP 302 Found.

## Alternatives considered

- **Feedback board:** clear CRUD workflows, but less directly suited to
  demonstrating observable request routing.
- **Inventory tracker:** useful business rules, but more domain complexity than
  needed for the deployment lab.
- **Accounts or custom aliases in the first release:** add scope and security
  requirements before the core deployment workflow is established.
- **Browser interface in the first release:** adds frontend work that is not
  required to practice the deployment and backend fundamentals.
- **Accepting arbitrary URL schemes:** rejected because schemes other than
  HTTP and HTTPS are unnecessary for this MVP and can create unsafe redirect
  behavior.
- **Permanent redirects (301):** rejected for the MVP because browsers and
  intermediaries may cache permanent redirects, making behavior changes harder
  to observe during the rollout exercises.

## Consequences

- The feature is small enough to build in staged increments.
- Different application versions can produce visible, testable behavior
  through the proxy.
- API consumers can exercise the MVP with curl and automated tests without
  introducing a separate frontend.
- Route ordering must keep the existing `/health` endpoint distinct from
  short-code resolution.
- Click counts are intentionally simple request totals, not unique-visitor
  analytics.
- URL validation must check the scheme as well as that the destination is a
  well-formed URL.
- Random codes are less predictable than sequential IDs, but do not provide
  access control or make the public link list private.
- Temporary redirects keep the destination response behavior easier to change
  and test while the service is under active development.
- Code uniqueness still needs to be enforced in storage; the exact code
  alphabet, length, and collision handling will be settled during technical
  design.
- Without accounts, the list and creation behavior are not private. The MVP is
  a learning service, not intended for public production use.
- Authentication, link ownership, and custom codes can be evaluated later as
  separate changes.
