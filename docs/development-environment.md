# Development environment setup

This project targets Windows 11 with Docker Desktop using its WSL 2 backend.
Install Node.js locally as well: Docker provides a consistent container
runtime, while local Node.js is useful for running JavaScript tooling and
tests directly on the host. Git and Visual Studio Code are already present on
the machine used to prepare this guide.

Installing Docker Desktop and WSL changes Windows components and may require
administrator approval and a restart. If you cannot approve those changes,
ask your administrator to perform the WSL setup and install Docker Desktop.

## 1. Install and initialize WSL 2

Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

Restart Windows if prompted. On first launch of the installed Linux
distribution, create its Linux username and password. Then open a regular
PowerShell window and verify:

```powershell
wsl --status
wsl --list --verbose
```

The installed distribution should use WSL version 2. If it shows version 1,
set the default for future distributions and convert the installed one:

```powershell
wsl --set-default-version 2
wsl --set-version <distribution-name> 2
```

Replace `<distribution-name>` with the name shown by `wsl --list --verbose`.

## 2. Install Docker Desktop

Download Docker Desktop for Windows from the official
[Docker Desktop download page](https://www.docker.com/products/docker-desktop/).
Run the installer and approve administrator prompts as required.

In Docker Desktop:

1. Use the **WSL 2** engine/backend when offered.
2. In **Settings → Resources → WSL Integration**, enable integration for the
   installed Linux distribution.
3. Start Docker Desktop and wait until it reports that the engine is running.

Open a new PowerShell terminal and verify the CLI and Compose plugin:

```powershell
docker --version
docker compose version
docker info
```

`docker info` should complete and show the running engine. The Docker CLI being
on `PATH` makes the `docker` command discoverable; a running Docker Desktop
engine is also required to build or run containers.

## 3. Install Node.js LTS

Download Node.js 24 LTS for Windows from the official
[Node.js download page](https://nodejs.org/en/download).
Run the Windows installer and leave the option to add Node.js to `PATH`
enabled. The npm package manager is included.

Close and reopen PowerShell and VS Code terminals so they read the updated
`PATH`, then verify:

```powershell
node --version
npm --version
```

If either command is not found, confirm the installer completed, open a new
terminal, and check that the Node.js install directory is present in the
Windows user or system `PATH`.

## 4. Verify the development prerequisites

Run the following in a new PowerShell terminal:

```powershell
git --version
node --version
npm --version
docker --version
docker compose version
docker info
```

All commands should succeed. For an end-to-end Docker check from the repository root, start the v1 MVP:

```powershell
docker compose up --build
```

Open `http://localhost:8080` to confirm it responds. Stop the foreground
Compose session with `Ctrl+C`, then remove its containers with:

```powershell
docker compose down
```

This check validates Docker Compose, the one-shot database migration, and the
v1 application stack.

## What this setup does and does not provide

- Docker Desktop and WSL 2 support this repository and many projects whose
  development environment is containerized.
- Host Node.js supports projects and tools that run directly on Windows.
- `PATH` only lets the shell find installed commands; it does not install a
  runtime, package, database, or service.
- No single machine setup guarantees every future project is ready. Other
  languages, databases, SDKs, or project-specific services may still need to
  be installed, or supplied by that project's containers.
