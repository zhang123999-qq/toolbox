# Installation and Quick Start

> [中文](getting-started.md) | **English**
> This page does exactly one thing: get Toolbox running as fast as possible. For concepts and
> architecture see [`../spec/README.md`](../spec/README.md); for the dev environment and the
> add-a-tool workflow see [`../DEVELOPMENT.md`](../DEVELOPMENT.md).

---

## 1. Pick a path first

All three paths ship **the same static artifact** (`apps/web/dist`); they differ only in what the
target machine must have.

| Path                 | Target machine needs               | Good for                                                    | Go to                                                |
| -------------------- | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| Binary deployment    | `sh` + `tar` + `systemd` + `nginx` | single-server rollouts, internal servers, Docker-free hosts | [§2](#2-binary-deployment-linux-servers-recommended) |
| Container deployment | Docker                             | self-hosting, scale-out                                     | [§3](#3-container-deployment)                        |
| Local development    | Node ≥ 22.22 / pnpm                | changing code, adding tools                                 | [§4](#4-local-development)                           |

---

## 2. Binary deployment (Linux servers, recommended)

### 2.1 Prerequisites

| Item       | Requirement                             | Check with               |
| ---------- | --------------------------------------- | ------------------------ |
| OS         | Linux x86_64 / aarch64                  | `uname -m`               |
| init       | systemd                                 | `ls /run/systemd/system` |
| Web server | nginx ≥ 1.21 (can be installed for you) | `nginx -v`               |
| Privileges | root                                    | `id -u`                  |
| Disk       | ≈ 50MB                                  | `df -h /opt`             |

You can self-check before installing — it will tell you exactly what is missing:

```bash
curl -fsSL <release-source>/install.sh | sudo bash -s -- --source <release-source> --dry-run
```

### 2.2 Install with one line

```bash
curl -fsSL <release-source>/install.sh | sudo bash -s -- --source <release-source>
```

`<release-source>` is a directory or HTTP base containing `install.sh`, `latest.txt`,
`toolbox-<version>-linux-<arch>.tar.gz` and its `.sha256`. If you do not have one yet, serve it
straight from a machine that already has `dist-release/`:

```bash
cd dist-release && python3 -m http.server 8899
# so the release source is http://<that-host-ip>:8899
```

Common flags:

| Need                            | Extra flag        |
| ------------------------------- | ----------------- |
| Change the port (default 8081)  | `--port 9090`     |
| Install nginx automatically     | `--install-deps`  |
| Pin a version                   | `--version 0.0.1` |
| Lay down files without starting | `--no-start`      |
| Preview the actions             | `--dry-run`       |

> Once installed the site is at `http://<host>:8081/`. The default port is **8081**, matching the
> container form and avoiding privileged port 80; besides `--port` you can override it with the
> environment variable `TOOLBOX_PORT=9090`.

### 2.3 Manual install

When you skip the one-liner, or want to inspect the bundle first:

```bash
tar -xzf toolbox-0.0.1-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.1-linux-amd64.tar.gz --install-deps
```

The one-liner and the manual install run **the same landing logic** (the script ultimately calls
`toolboxctl install`), so the two can never diverge in behaviour.

### 2.4 Three things to do right after

```bash
toolboxctl status     # service / version / port / health at a glance
toolboxctl health     # probes /healthz, returns ok v<version>
toolboxctl logs -n 50 # first place to look when something is wrong
```

---

## 3. Container deployment

### 3.1 Build and run

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .
docker run -d --name toolbox-web -p 8081:8081 toolbox-web:dev
```

The image pre-renders the site during build; nginx serves gzip, long-lived asset caching,
the WASM MIME type and a real 404 page.

### 3.2 Port conflicts

The container's nginx listens on **8081** (the same default as the binary deployment, so
`-p 8081:8081` means host 8081 → container 8081). If the host port is taken, just change the
mapping — e.g. `-p 9090:8081` — with **no image change required**. When both deployment forms
run on one machine they must use different host ports, since both default to 8081.

---

## 4. Local development

### 4.1 Requirements

Node ≥ 22.22 and pnpm ≥ 9. Run `pnpm install` with `--ignore-scripts`: esbuild's postinstall fails on
some Windows setups due to file locks, and its binary comes from the platform package anyway.

### 4.2 Everyday commands

```bash
pnpm install --ignore-scripts
pnpm dev          # development server
pnpm verify       # full gate: metadata + docs + lint + format + types + tests
pnpm build:ssg    # client build + SSR build + pre-render 27 static pages
```

---

## 5. Verify the installation

```bash
curl -s http://127.0.0.1/healthz          # expect: ok v<version>
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/tools/json-formatter   # expect: 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/nonexistent-page       # expect: 404
```

The third one is easy to overlook but matters: unknown paths must return **404**, not 200 with the
home page. The latter is a "soft 404" and feeds search engines a pile of meaningless pages.

---

## 6. Live demo (not launched yet)

The site is not live yet, so the following domains are currently **unreachable**. They are
recorded here only as the future live-demo entry points:

| Address                   | Status                                         |
| ------------------------- | ---------------------------------------------- |
| <https://006336.xyz/>     | not launched yet                               |
| <https://www.006336.xyz/> | not launched yet (alias of the primary domain) |

Until launch, reach the site through one of the three paths in this document, locally or on your
internal network. At build time set `SITE_ORIGIN` to the production domain, otherwise the sitemap
and page canonicals point at a placeholder address (see [`configuration.md`](configuration.md) §2).

---

## 7. Next steps

| I want to…                                     | Read                                             |
| ---------------------------------------------- | ------------------------------------------------ |
| Learn the site and the CLI                     | [`usage.md`](usage.md)                           |
| Change the port, update source or site address | [`configuration.md`](configuration.md)           |
| Something will not install or start            | [`troubleshooting.md`](troubleshooting.md)       |
| Contribute code                                | [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) |
