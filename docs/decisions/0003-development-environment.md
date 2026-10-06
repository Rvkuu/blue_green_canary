# ADR 0003: Windows development environment


## Context

The existing deployment lab uses Docker Compose, and the URL-shortener MVP
will use Node.js. The development machine is Windows 11 and currently has Git
and Visual Studio Code, but Docker, WSL, Node.js, npm, and winget are not
available on `PATH`.

The environment should support this project end-to-end and also be useful for
future containerized and native Node.js projects.

## Decision

Use Docker Desktop with its WSL 2 backend for containers, and install the
Node.js LTS release locally for host-side JavaScript development. Keep Git and
Visual Studio Code as the existing editor and version-control tools.

The machine owner will perform the required administrator-approved WSL and
Docker Desktop installation steps manually. Do not depend on winget being
available.

## Alternatives considered

- **Docker Desktop only:** covers containerized projects but does not provide
  host `node` or `npm` commands for native workflows.
- **Local Node.js only:** supports Node development but not this repository's
  existing Docker Compose deployment lab.
- **Install every possible language and service globally:** not practical;
  future projects have different runtime and service requirements.

## Consequences

- Both containerized and native Node.js workflows are available after setup.
- Docker Desktop requires WSL 2, an administrator-approved installation, and
  may require a Windows restart.
- Other language runtimes and services remain project-specific.
- Detailed setup and verification steps are in
  [`development-environment.md`](../development-environment.md).
