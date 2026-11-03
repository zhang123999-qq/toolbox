# Toolbox Deployment Guide

> [中文](DEPLOYMENT.md) | **English**

> This document covers the complete production deployment workflow: infrastructure preparation, three deployment paths, environment variable dictionary, upgrade/rollback operations, and troubleshooting checklist.

---

## Table of Contents

1. [Target Machine Requirements](#1-target-machine-requirements)
2. [Three Deployment Paths](#2-three-deployment-paths)
3. [Directory Layout & Independent Instance Isolation](#3-directory-layout--independent-instance-isolation)
4. [Environment Variable Dictionary](#4-environment-variable-dictionary)
5. [Upgrade & Rollback Operations Manual](#5-upgrade--rollback-operations-manual)
6. [Self-Hosted / Internal Release Source](#6-self-hosted--internal-release-source)
7. [Containerized Deployment](#7-containerized-deployment)
8. [Troubleshooting Checklist](#8-troubleshooting-checklist)
9. [Security Baseline](#9-security-baseline)

---

## 1. Target Machine Requirements

### 1.1 Binary Deployment (Recommended for Linux Servers)

| Item              | Requirement                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------ |
| OS                | Linux x86_64 / aarch64                                                                     |
| Init System       | systemd (`/run/systemd/system` must exist)                                                 |
| Web Server        | nginx ≥ 1.21 (auto-installable via `--install-deps`)                                       |
| Baseline Commands | `sh` `tar` `gzip` `sha256sum` `awk` `sed` `curl` (or `wget`)                               |
| Privileges        | root (install, uninstall, service management, write `/opt`, install systemd unit)          |
| Disk              | ≈ 50 MB (`/opt/toolbox`, including old/new version redundancy)                             |
| Network           | Only online install/upgrade needs `curl`/`wget`; offline can use local directory as source |

> **Not Required**: Go, Node.js, pnpm, Docker, Python

### 1.2 Container Deployment

| Item         | Requirement                        |
| ------------ | ---------------------------------- |
| Runtime      | Docker ≥ 24 / Podman               |
| Architecture | linux/amd64, linux/arm64           |
| Port Mapping | Host port → container 8081 (fixed) |

---

## 2. Three Deployment Paths

Choose one based on target machine environment.

### 2.1 Path ①: Binary Deployment (Recommended, Production First Choice)

**Target machine only needs `sh` + `tar` + `systemd` + `nginx`, no build toolchain required.**

#### One-Click Install (GitHub Release Source, Recommended Entry)

```bash
# Review script first (security best practice)
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | less

# Confirm clean, then execute
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash
```

> 🔒 **Security Note**: `curl … | bash` pipes remote script directly to shell. Recommended to download and review first, or use `--dry-run` to preview.

#### Common Variants

| Need                       | Command |
| -------------------------- | ------- |
| Change port (default 8081) | `curl … | sudo bash -s -- --port 9090`                    |
| Auto-install nginx         | `curl … | sudo bash -s -- --install-deps`                 |
| Specific version           | `curl … | sudo bash -s -- --version 0.0.6`                |
| Preview only (no install)  | `curl … | sudo bash -s -- --dry-run`                      |
| Domestic network via proxy | `curl … | sudo bash -s -- --proxy http://127.0.0.1:10808` |
| Use mirror acceleration    | `curl … | sudo bash -s -- --mirror https://ghfast.top`    |
| Install only, no start     | `curl … | sudo bash -s -- --no-start`                     |

#### Manual Install (Bundle Already Downloaded Locally)

```bash
tar -xzf toolbox-0.0.6-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.6-linux-amd64.tar.gz --install-deps
```

### 2.2 Path ②: Container Deployment

```bash
# Build image (multi-stage: Node 24 build → nginx static hosting)
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .

# Run (container internal and external both 8081)
docker run -d --name toolbox-web -p 8081:8081 toolbox-web:dev

# Production: pin version tag, configure restart policy, mount log dir
docker run -d \
  --name toolbox-web \
  --restart unless-stopped \
  -p 8081:8081 \
  -v /var/log/toolbox:/opt/toolbox/logs \
  toolbox-web:0.0.6
```

> Container internal port is **fixed at 8081**; change host port via `-p <host>:8081`.

### 2.3 Path ③: Local Development

```bash
# 1. Install deps (Windows sandbox: esbuild postinstall EBUSY, add --ignore-scripts)
pnpm install --ignore-scripts

# 2. Start dev server (default http://localhost:5173)
pnpm dev

# 3. Metadata validation
pnpm check:tools

# 4. Build + SSR + pre-render all static pages (CI complete artifact)
pnpm build:ssg
```

> Windows sandbox `pnpm dev` reports `os error 231`, add `--concurrency=1`.

---

## 3. Directory Layout & Independent Instance Isolation

### 3.1 Post-Install Directory Structure

```
/opt/toolbox/
├── current -> releases/0.0.6          # Atomic symlink, sole switch point
├── releases/
│   └── 0.0.6/                         # Immutable version dir (extract and run)
│       ├── app/                       # Static assets: html/js/css/wasm/…
│       ├── bin/toolboxctl             # Management CLI
│       ├── conf/                      # Templates: nginx.conf.tpl / toolbox.service.tpl / mime.types
│       ├── VERSION                    # Version number (e.g. 0.0.6)
│       ├── manifest.json              # {"version":"0.0.6","gitCommit":"abc123"}
│       └── checksums.txt              # Per-file sha256
├── shared/                            # Cross-version shared state
│   ├── nginx.conf                     # Rendered nginx main config
│   ├── toolbox.service                # Rendered systemd unit
│   └── state/                         # Runtime state
│       ├── installed                  # Current version
│       └── previous                   # Previous version (for rollback)
├── logs/                              # nginx error.log / access.log
└── run/                               # nginx.pid / temp dirs
```

### 3.2 Independent nginx Instance Isolation

- **Uses only system nginx binary** (`/usr/sbin/nginx` etc.), never reads `/etc/nginx`
- Own `pid`, `error_log`, temp dirs, MIME table
- `toolboxctl start/stop/restart/reload` affects only this site
- Uninstall does not impact other nginx sites on same machine
- systemd unit name fixed to `toolbox.service`, **one managed instance per machine**

---

## 4. Environment Variable Dictionary

Variables can be passed at install/upgrade/runtime via environment (CLI args take precedence).

### 4.1 Install/Upgrade/Runtime Common

| Variable                | Applicable Stages            | Description                                      | Default                          | Example                                                |
| ----------------------- | ---------------------------- | ------------------------------------------------ | -------------------------------- | ------------------------------------------------------ |
| `TOOLBOX_PORT`          | install / upgrade / render   | Site listen port                                 | `8081`                           | `TOOLBOX_PORT=9090`                                    |
| `UPDATE_SOURCE`         | upgrade / check-update       | Upgrade source base URL                          | GitHub Releases latest/download  | `UPDATE_SOURCE=http://mirror.internal/releases`        |
| `GITHUB_TOKEN`          | install (GitHub Release)     | Required for private repo Release access         | —                                | `GITHUB_TOKEN=ghp_xxx`                                 |
| `TOOLBOX_REPO`          | install (GitHub Release)     | Override repo (default `zhang123999-qq/toolbox`) | —                                | `TOOLBOX_REPO=myorg/toolbox`                           |
| `TOOLBOX_PROXY`         | install / upgrade (download) | HTTP proxy for downloads                         | —                                | `TOOLBOX_PROXY=http://127.0.0.1:10808`                 |
| `COREPACK_NPM_REGISTRY` | Docker build                 | corepack pnpm mirror                             | `https://registry.npmmirror.com` | `COREPACK_NPM_REGISTRY=https://registry.npmmirror.com` |
| `SITE_ORIGIN`           | build (sitemap/canonical)    | Site absolute URL                                | Built-in value                   | `SITE_ORIGIN=https://tools.example.com`                |

### 4.2 Build/Runtime (Tool-specific)

> Full list in [`.env.example`](../.env.example) and [`docs/DEVELOPMENT.md §8.5`](DEVELOPMENT.md#85-外部-api-配置硬约束)

| Variable                        | Purpose                                     | Is Secret | VITE_ Prefix |
| ------------------------------- | ------------------------------------------- | --------- | ------------ |
| `VITE_TOOLBOX_AI_API_BASE`      | OpenAI-compatible chat completions endpoint | No        | ✅ Allowed   |
| `VITE_TOOLBOX_AI_MODEL`         | Default model name                          | No        | ✅ Allowed   |
| `TOOLBOX_AI_API_KEY`            | Self-hosted proxy server-side key           | **Yes**   | ❌ Forbidden |
| `TOOLBOX_EXCHANGE_RATE_API_KEY` | exchangerate.host access_key                | **Yes**   | ❌ Forbidden |

> ⚠️ **Red line**: Secret variables **must not** use `VITE_` prefix, otherwise Vite inlines them into the browser bundle, readable by anyone viewing `dist/*.js`.

### 4.3 Priority Order

```
CLI arg > installed instance config > env var > built-in default
```

Example (`--port`):

```
toolboxctl install --port 9090        # Highest
/etc/toolbox/toolbox.conf PORT        # Next
TOOLBOX_PORT=9090                     # Next
default 8081                          # Fallback
```

---

## 5. Upgrade & Rollback Operations Manual

### 5.1 Upgrade Flow

```bash
# 1. Query available updates
toolboxctl check-update
# Sample output:
# 升级源       : https://github.com/zhang123999-qq/toolbox/releases/latest/download (url)
# 当前版本     : 0.0.6
# 源内最新版本 : 0.0.7
# → 有新版本可升级：0.0.6 → 0.0.7
#   执行：toolboxctl upgrade --source https://github.com/zhang123999-qq/toolbox/releases/latest/download

# 2. Perform upgrade (default from config UPDATE_SOURCE or built-in default)
toolboxctl upgrade

# 3. Upgrade to specific version (allows same-version reinstall, intentional downgrade)
toolboxctl upgrade --to 0.0.7

# 4. Force reinstall current version (fix broken config, rebuild instance)
toolboxctl upgrade --to 0.0.6 --force

# 5. Switch symlink only, no reload (CI/blue-green pre-check)
toolboxctl upgrade --no-reload
```

#### Key Upgrade Behaviors

| Scenario                                                | Behavior                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Source version = current version                        | **Skip update**, print `Already latest ✅`                                    |
| Source version < current (stale mirror/fallback source) | **Skip update**, warn suspected fallback source, suggest `rollback`/`--force` |
| Explicit `--to` version                                 | Allows same-version reinstall, allows downgrade                               |
| Health check fails post-upgrade (15s no new version)    | **Auto-rollback** to previous version, error with logs preserved              |
| Config syntax validation fails                          | Auto-rollback, no nginx reload                                                |

### 5.2 Rollback Flow

```bash
# 1. Rollback to previous version (recorded during install/upgrade)
toolboxctl rollback

# 2. Rollback to specific version
toolboxctl rollback --to 0.0.5

# 3. Fallback when no record: pick max version other than current
toolboxctl rollback  # Auto-selects max historical version when previous missing
```

#### Key Rollback Behaviors

- Switch `current` symlink → re-render config → `systemctl reload` → poll for version confirmation
- Rollback health check failure warns but **no second rollback** (avoid oscillation)
- `toolboxctl status` anytime to verify `Version Consistent` field

### 5.3 Manual Rollback Intervention (Extreme Cases)

If `toolboxctl` itself is broken or systemd abnormal:

```bash
# 1. Direct symlink switch
ln -sfn releases/0.0.5 /opt/toolbox/current

# 2. Re-render config (using old version's toolboxctl)
/opt/toolbox/releases/0.0.5/bin/toolboxctl render --prefix /opt/toolbox --out /opt/toolbox/shared

# 3. Reload nginx
systemctl reload toolbox.service

# 4. Verify
curl -fsS http://127.0.0.1:8081/healthz
```

---

## 6. Self-Hosted / Internal Release Source

Production recommended: no GitHub reachability dependency, also solves air-gapped machines.

### 6.1 Release Source Directory Structure

```
<release-source-root>/
├── latest.txt                              # Single-line version, e.g. 0.0.6
├── index.json                              # Version index (version/filename/sha256)
├── install.sh                              # One-click install script
├── toolbox-0.0.6-linux-amd64.tar.gz        # Deployment package
├── toolbox-0.0.6-linux-amd64.tar.gz.sha256 # Whole-package checksum
├── toolbox-0.0.6-linux-arm64.tar.gz
└── toolbox-0.0.6-linux-arm64.tar.gz.sha256
```

### 6.2 Hosting Release Source (Pick One)

```bash
# A. Simple HTTP server (on machine with build artifacts)
cd dist-release && python3 -m http.server 8899

# B. nginx serving same directory
# server { root /path/to/dist-release; autoindex on; }

# C. S3 / OSS / Any static file service
```

### 6.3 Target Machine Install from Self-Hosted Source

```bash
# One-liner install
curl -fsSL http://<source-ip>:8899/install.sh | sudo bash -s -- --source http://<source-ip>:8899

# Or persist in config (writes to /etc/toolbox/toolbox.conf)
echo "UPDATE_SOURCE='http://<source-ip>:8899'" | sudo tee -a /etc/toolbox/toolbox.conf
toolboxctl install  # No --source needed thereafter
```

### 6.4 Target Machine Upgrade from Self-Hosted Source

```bash
toolboxctl upgrade --source http://<source-ip>:8899
# Or with UPDATE_SOURCE configured
toolboxctl upgrade
```

> Release source directory **must** have `latest.txt` and matching arch `.tar.gz` + `.sha256`, otherwise `check-update`/`upgrade` will error.

---

## 7. Containerized Deployment

### 7.1 Dockerfile Key Points (`deploy/docker/Dockerfile`)

- Multi-stage build: Node 24 (alpine) build → nginx:1.27-alpine runtime
- Build-time inject `SITE_ORIGIN`, `VERSION`, render nginx config and `/healthz`
- Container fixed listen 8081, `EXPOSE 8081`, `HEALTHCHECK` probes `/healthz`
- `COREPACK_NPM_REGISTRY` defaults to npmmirror, override via `--build-arg` for China networks
- Base image switchable via `--build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:24-alpine`

### 7.2 Build & Run

```bash
# Build (with version tag)
docker build \
  -f deploy/docker/Dockerfile \
  -t toolbox-web:0.0.6 \
  --build-arg SITE_ORIGIN=https://tools.example.com \
  --build-arg VERSION=0.0.6 \
  .

# Run (production recommended)
docker run -d \
  --name toolbox-web \
  --restart unless-stopped \
  -p 8081:8081 \
  -v /var/log/toolbox:/opt/toolbox/logs \
  toolbox-web:0.0.6

# Verify
docker exec toolbox-web wget -qO- http://127.0.0.1:8081/healthz
# Output: ok v0.0.6
```

### 7.3 Docker Compose (`deploy/docker/docker-compose.dev.yml`)

```yaml
services:
  web:
    build:
      context: .
      dockerfile: deploy/docker/Dockerfile
    ports:
      - '8081:8081'
    volumes:
      - ./logs:/opt/toolbox/logs
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:8081/healthz']
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 8. Troubleshooting Checklist

### 8.1 Install Phase

| Symptom                                 | Troubleshooting Steps                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `curl \| bash` reports "Install failed" | 1. `curl … \| less` review script<br>2. Add `--dry-run` preview actions<br>3. Check output above for `toolboxctl` non-zero exit cause   |
| "nginx not found"                       | Add `--install-deps` auto-install, or manual `apt-get install -y nginx`                                                                 |
| "Port 8081 already in use"              | `ss -lntp \| grep :8081` identify holder; change `--port` or free port                                                                  |
| Install with `--proxy` always fails     | **Known issue**: health check hijacked by proxy. `toolboxctl` fixed (explicit `--noproxy '*'`); ensure latest `install.sh` from Release |
| "sha256 verification failed"            | Package corrupted or tampered; check network/proxy didn't serve error page instead of bundle                                            |
| `install.sh` swallows deploy failure    | **Known issue**: old `install.sh` lacked `set -e`. Ensure using latest from Release attachment                                          |

### 8.2 Runtime Phase

| Symptom                                                                 | Troubleshooting Steps                                                                                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toolboxctl status` shows "Health check: Failed"                        | 1. `toolboxctl logs -n 50` check nginx error log<br>2. `systemctl status toolbox.service` confirm active<br>3. `curl -fsS http://127.0.0.1:8081/healthz` direct probe |
| "Version Consistent: ✗ Server reports v0.0.5, current points to v0.0.6" | nginx not yet reloaded; run `toolboxctl reload` or wait for async effect                                                                                              |
| Site-wide 403                                                           | Permissions: `chmod -R u=rwX,go=rX /opt/toolbox/releases/<version>` (nginx worker needs read)                                                                         |
| Wrong URL returns 200 + home page (soft 404)                            | nginx config not effective; check `toolboxctl config` and `nginx -t`                                                                                                  |
| WASM load fails (MIME type error)                                       | Confirm nginx config has `application/wasm`; verify via `toolboxctl config`                                                                                           |
| New tool not in search                                                  | Run `pnpm generate:catalog` rebuild index (catalog & search index share source)                                                                                       |

### 8.3 Upgrade/Rollback Phase

| Symptom                                              | Troubleshooting Steps                                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `upgrade` reports "Cannot resolve available version" | Release source missing `latest.txt` or package list; check source dir structure         |
| `upgrade` auto-rolls back                            | Check `toolboxctl logs -n 100` for health check failure root cause                      |
| `rollback` reports "No rollback version found"       | `ls /opt/toolbox/releases/` confirm history exists; use `--to` explicit                 |
| Rollback but version still inconsistent              | `toolboxctl reload` force reload; if persists, manual symlink switch + re-render config |

### 8.4 Container Deployment

| Symptom                                                     | Troubleshooting Steps                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docker build` reports `base name should not be blank`      | `ARG` declared inside stage, move before first `FROM`                             |
| `pnpm install` reports `Could not reach registry.npmjs.org` | Set `COREPACK_NPM_REGISTRY` and proxy build-args (both upper and lower case)      |
| Home page returns `application/octet-stream`                | Server-level `types { }` overrides http-level MIME table; remove server `types`   |
| `/tools` returns 301 redirect                               | `try_files $uri $uri/` triggers dir trailing-slash; use `$uri/index.html`         |
| Typo URL returns 200 + home page                            | Fallback `/index.html` causes soft 404; use `try_files $uri $uri/index.html =404` |

---

## 9. Security Baseline

### 9.1 Deployment Layer

- **Whole-package sha256**: Mandatory `.sha256` verification at install/upgrade, missing = reject (`--no-verify` exception)
- **Per-file verification**: Bundle includes `checksums.txt` per-file sha256, verified again at install/upgrade
- **Independent nginx instance**: No `/etc/nginx` reads, no impact on other sites
- **Worker privilege drop**: Dedicated low-privilege user (default `toolbox`), master remains root for port binding
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- **CSP Report-Only**: `Content-Security-Policy-Report-Only`, observe in production before enforcing
- **True 404**: Avoid soft 404 polluting search index
- **Non-interactive install**: `curl \| bash` scenario has stdin occupied, script has zero `read`

### 9.2 Application Layer

- **Pure frontend local compute**: Most tools run in browser locally, data never uploaded
- **External APIs browser-direct only**: DNS/Whois/HTTP/Webhook etc. go browser→public APIs, never through our server
- **Keys never leave browser**: BYOK (Bring Your Own Key) mode stores Key only in `localStorage`/component state, no files, no logs
- **Dependency license gate**: `pnpm check:licenses` blocks GPL/AGPL/SSPL/BUSL viral licenses
- **No telemetry/tracking**: Zero user behavior collection

---

## 10. Version Touchpoints (Five Must Match)

| Touchpoint                | Example                            | Written By               | Purpose                                               |
| ------------------------- | ---------------------------------- | ------------------------ | ----------------------------------------------------- |
| `deploy/binary/VERSION`   | `0.0.6`                            | Manual (source of truth) | Build & CLI version sole source                       |
| bundle filename           | `toolbox-0.0.6-linux-amd64.tar.gz` | `build-bundle.sh`        | User-visible, upgrade source parses version from name |
| bundle internal `VERSION` | `0.0.6`                            | `build-bundle.sh`        | Install-time "package version" verification           |
| bundle `manifest.json`    | `"version": "0.0.6"`               | `build-bundle.sh`        | Trace "which commit produced this package"            |
| git tag / Release         | `v0.0.6`                           | `gh release create`      | Bind to source history                                |
| `/healthz` response       | `ok v0.0.6`                        | nginx config render time | Prove "which version is actually running"             |

---

## 11. Related Documentation

| Need                                 | Document                           |
| ------------------------------------ | ---------------------------------- |
| CLI full reference, healthz endpoint | [`API.md`](API.md)                 |
| Release process, version management  | [`RELEASE.md`](RELEASE.md)         |
| Change history                       | [`CHANGELOG.md`](../CHANGELOG.md)  |
| Developer guide, adding tools        | [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| Complete environment variable list   | [`.env.example`](../.env.example)  |

---

_This document is updated in sync with code, version: v2.0 · 2026-10-24_
