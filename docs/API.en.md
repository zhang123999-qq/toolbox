# Toolbox API Reference

> [中文](API.md) | **English**

> This document describes Toolbox's **external interfaces**: the `toolboxctl` management CLI and the `/healthz` HTTP health check endpoint.
> This project is a pure frontend static site and does not provide traditional REST / GraphQL APIs.

---

## Table of Contents

1. [toolboxctl CLI](#1-toolboxctl-cli)
2. [/healthz HTTP Endpoint](#2-healthz-http-endpoint)
3. [nginx Config Template Variables](#3-nginx-config-template-variables)
4. [Environment Variable Quick Reference](#4-environment-variable-quick-reference)

---

## 1. toolboxctl CLI

### 1.1 Overview

`toolboxctl` is the management CLI bundled with the deployment package. After installation it is globally available at `/usr/local/bin/toolboxctl`. Written in pure POSIX `sh`; the target machine only needs `sh`, `tar`, `systemd`, `nginx`.

**Design principles**:

- All subcommands uniformly support `--prefix` (instance root), and the argument always takes effect
- All deployment logic is centralized here; `install.sh` only handles download/verify/extract then calls `toolboxctl install`
- Directory layout: `<prefix>/releases/<ver>/` immutable versions, `<prefix>/current -> …` atomic symlink, `<prefix>/shared/` cross-version shared state
- Runs an independent nginx instance (own pid/logs/temp dirs/MIME table), uses only the system nginx binary, never reads `/etc/nginx`

### 1.2 Global Options

| Option         | Description                              | Default        |
| -------------- | ---------------------------------------- | -------------- |
| `--prefix DIR` | Site installation root (all subcommands) | `/opt/toolbox` |

> Must be an absolute path. With multiple instances, note the systemd unit name is fixed to `toolbox.service`; a single machine supports only one managed service instance.

### 1.3 Complete Subcommand Reference

#### Install / Uninstall

| Command     | Arguments                                                                                                                        | Description                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `install`   | `--from <tar.gz\|dir\|url>`<br>`--port N`<br>`--prefix DIR`<br>`--nginx-user U`<br>`--install-deps`<br>`--no-start`<br>`--force` | Deploy from bundle. `--port` defaults to 8081; `--install-deps` runs `apt-get install nginx`; `--force` overwrites same version                        |
| `uninstall` | `--purge`<br>`--purge-deps`<br>`--keep-user`                                                                                     | Stop service, remove config. `--purge` full cleanup (including `/opt/toolbox` and `/etc/toolbox`); `--purge-deps` removes nginx installed by this tool |

#### Daily Operations

| Command                                    | Arguments                                                                                     | Description                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `status`                                   | none                                                                                          | Service/version/port/health overview                                              |
| `start` \| `stop` \| `restart` \| `reload` | none                                                                                          | systemd service control; `start`/`restart` poll until version confirmed           |
| `health`                                   | none                                                                                          | Probe `/healthz` and print version (waits for version consistency)                |
| `logs`                                     | `-n N` (default 50)<br>`-f` \| `--follow`                                                     | View journal + nginx error/access logs                                            |
| `config`                                   | none                                                                                          | Print effective config (`/etc/toolbox/toolbox.conf` + rendered nginx main config) |
| `list`                                     | none                                                                                          | List installed versions (* marks current)                                         |
| `backup`                                   | `--output DIR` (default `/var/backups/toolbox`)                                               | Backup config and shared state to `toolbox-backup-<timestamp>.tar.gz`             |
| `doctor`                                   | none                                                                                          | Environment self-check: deps/port/disk/perms/service/config/upgrade source        |
| `version`                                  | none                                                                                          | Show CLI version and installed version                                            |
| `render`                                   | `--tpl-dir D`<br>`--out D`<br>`--prefix P`<br>`--port N`<br>`--nginx-user U`<br>`--version V` | Render config templates only (for CI/container nginx validation), no installation |

#### Online Upgrade

| Command        | Arguments                                                             | Description                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check-update` | `--source <dir\|url>`                                                 | Query available updates; outputs current version, latest in source, suggested action                                                                         |
| `upgrade`      | `--source <dir\|url>`<br>`--to VERSION`<br>`--force`<br>`--no-reload` | **Skips update when no higher version detected** (no instance changes); explicit `--to` allows same-version reinstall or downgrade; auto-rollback on failure |
| `rollback`     | `--to VERSION`                                                        | Rollback to historical version; omitting `--to` uses previous-version record, or max version other than current                                              |

### 1.4 Upgrade Source Resolution

`--source` can be a local directory or HTTP base URL. The directory must contain:

- `latest.txt`: latest version number
- `toolbox-<ver>-linux-<arch>.tar.gz` and its `.sha256`

Priority: `--source` > config `UPDATE_SOURCE` > built-in default
`https://github.com/zhang123999-qq/toolbox/releases/latest/download`

### 1.5 Config File

Path: `/etc/toolbox/toolbox.conf` (maintained by `toolboxctl`, editable; run `reload` after manual changes)

```ini
# Toolbox runtime config (maintained by toolboxctl, editable; reload after changes)
PREFIX='/opt/toolbox'
PORT='8081'
NGINX_USER='toolbox'
NGINX_BIN='/usr/sbin/nginx'
UPDATE_SOURCE='https://github.com/zhang123999-qq/toolbox/releases/latest/download'
SERVICE_NAME='toolbox'
INSTALLED_AT='2026-10-22T14:30:00+08:00'
```

### 1.6 Directory Layout

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

---

## 2. /healthz HTTP Endpoint

### 2.1 Overview

- **Path**: `GET /healthz`
- **Implementation**: nginx config uses `return 200 "ok v<VERSION>\n"` directly, no backend process
- **Purpose**: Install/upgrade/rollback flows use this to determine "switch success"; `toolboxctl health` / `status` / `upgrade` / `rollback` all poll this endpoint

### 2.2 Request Example

```bash
curl -fsS http://127.0.0.1:8081/healthz
```

### 2.3 Response

| Field         | Description                                           |
| ------------- | ----------------------------------------------------- |
| HTTP Status   | `200 OK`                                              |
| Content-Type  | `text/plain`                                          |
| Cache-Control | `no-store`                                            |
| Body          | `ok v0.0.6` (version matches `deploy/binary/VERSION`) |

### 2.4 Semantics

| Response              | Meaning                                                         |
| --------------------- | --------------------------------------------------------------- |
| `ok v<current>`       | Service healthy, running version matches `current` symlink      |
| `ok v<old>`           | Service healthy, but nginx not yet reloaded (`reload` is async) |
| No response / non-200 | Service unhealthy or port not listening                         |

> **Note**: `toolboxctl` health checks **explicitly bypass proxy** (`curl --noproxy '*'`) to prevent the install script's `--proxy` from routing loopback probes to the proxy server.

---

## 3. nginx Config Template Variables

`toolboxctl` renders the final config from `conf/nginx.conf.tpl`. Template variables:

| Variable        | Source                                            | Description                                                                                                               |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@PREFIX@`      | `PREFIX` (default `/opt/toolbox`)                 | Site installation root                                                                                                    |
| `@PORT@`        | `PORT` (default `8081`)                           | Listen port                                                                                                               |
| `@VERSION@`     | Version pointed by `current`                      | Written into `/healthz` response body                                                                                     |
| `@NGINX_BIN@`   | Auto-detected or config                           | nginx binary path                                                                                                         |
| `@NGINX_USER@`  | `NGINX_USER` (default `toolbox`)                  | Worker process user                                                                                                       |
| `@NGINX_GROUP@` | Auto-detected (`nobody`/`nogroup`)                | Worker process group, **must be explicit**; otherwise Debian/Ubuntu `user nobody;` fails with `getgrnam("nobody") failed` |
| `@DOC_URL@`     | Fixed `https://github.com/zhang123999-qq/toolbox` | systemd unit Documentation field                                                                                          |

### 3.1 Key Config Snippets

**Independent instance isolation**:

```nginx
pid               @PREFIX@/run/nginx.pid;
error_log         @PREFIX@/logs/error.log warn;
user              @NGINX_USER@ @NGINX_GROUP@;

client_body_temp_path  @PREFIX@/run/client_temp;
proxy_temp_path        @PREFIX@/run/proxy_temp;
fastcgi_temp_path      @PREFIX@/run/fastcgi_temp;
uwsgi_temp_path        @PREFIX@/run/uwsgi_temp;
scgi_temp_path         @PREFIX@/run/scgi_temp;
```

**Security headers** (effective immediately):

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**CSP Report-Only** (observation mode, not enforced):

```nginx
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
```

**Static asset long caching**:

```nginx
location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
location /wasm/   { expires 30d; add_header Cache-Control "public, immutable"; }
```

**True 404** (avoid soft 404 polluting search index):

```nginx
error_page 404 /404.html;
location = /404.html { internal; add_header Cache-Control "no-cache"; }
location / { try_files $uri $uri/index.html =404; }
```

---

## 4. Environment Variable Quick Reference

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

> Full list in [`.env.example`](../.env.example) and [`docs/DEVELOPMENT.en.md §8.5`](DEVELOPMENT.en.md#85-external-api-configuration-hard-constraint)

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

## 5. Version Touchpoints (Five Must Match)

| Touchpoint                | Example                            | Written By               | Purpose                                               |
| ------------------------- | ---------------------------------- | ------------------------ | ----------------------------------------------------- |
| `deploy/binary/VERSION`   | `0.0.6`                            | Manual (source of truth) | Build & CLI version sole source                       |
| bundle filename           | `toolbox-0.0.6-linux-amd64.tar.gz` | `build-bundle.sh`        | User-visible, upgrade source parses version from name |
| bundle internal `VERSION` | `0.0.6`                            | `build-bundle.sh`        | Install-time "package version" verification           |
| bundle `manifest.json`    | `"version": "0.0.6"`               | `build-bundle.sh`        | Trace "which commit produced this package"            |
| git tag / Release         | `v0.0.6`                           | `gh release create`      | Bind to source history                                |
| `/healthz` response       | `ok v0.0.6`                        | nginx config render time | Prove "which version is actually running"             |

---

## 6. Verification Examples

### 6.1 Post-Install Verification

```bash
# 1. Check status
toolboxctl status
# Sample output:
# 服务名称 : toolbox (toolbox.service)
# 服务状态 : active
# 已装版本 : 0.0.6
# 安装目录 : /opt/toolbox
# 监听端口 : 8081
# 运行用户 : toolbox (worker)
# 访问地址 : http://192.168.1.100:8081/
# 健康检查 : 通过 (ok v0.0.6)
# 版本一致 : ✓ 服务端运行的正是 current 指向的 0.0.6
# 已装版本集 : 0.0.6

# 2. Environment self-check
toolboxctl doctor

# 3. Direct health endpoint probe
curl -fsS http://127.0.0.1:8081/healthz
# Output: ok v0.0.6
```

### 6.2 Upgrade & Rollback Verification

```bash
# Query available updates
toolboxctl check-update
# Sample output:
# 升级源       : https://github.com/zhang123999-qq/toolbox/releases/latest/download (url)
# 当前版本     : 0.0.6
# 源内最新版本 : 0.0.7
# → 有新版本可升级：0.0.6 → 0.0.7
#   执行：toolboxctl upgrade --source https://github.com/zhang123999-qq/toolbox/releases/latest/download

# Perform upgrade
toolboxctl upgrade

# Rollback to previous version
toolboxctl rollback

# Rollback to specific version
toolboxctl rollback --to 0.0.5
```

### 6.3 Config Render Verification (CI/Container)

```bash
# Render config only, no install
toolboxctl render --prefix /opt/toolbox --port 8081 --version 0.0.6 --out /tmp/rendered

# Validate nginx syntax
nginx -t -c /tmp/rendered/nginx.conf
```

---

## 7. Related Documentation

| Need                                            | Document                           |
| ----------------------------------------------- | ---------------------------------- |
| Full deployment, infrastructure, rollback guide | [`DEPLOYMENT.md`](DEPLOYMENT.md)   |
| Release process, version management             | [`RELEASE.md`](RELEASE.md)         |
| Change history                                  | [`CHANGELOG.md`](../CHANGELOG.md)  |
| Developer guide, adding tools                   | [`DEVELOPMENT.md`](DEVELOPMENT.md) |

---

_This document is updated in sync with code, version: v2.0 · 2026-10-24_
