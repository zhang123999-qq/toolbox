# Toolbox · A Library of Online Tools

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/zhang123999-qq/toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/zhang123999-qq/toolbox/actions/workflows/ci.yml)

> **798 client-side online tools** that run entirely in your browser: local-first
> (nothing is uploaded), deployed as plain static files, and registered
> automatically the moment a directory is added.
> Bilingual (Chinese / English) · light & dark themes · no sign-in

[中文](README.md) | **English**

---

## Status

| Item                | Value                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Planned             | **900 tools across 21 categories in 5 groups** (dev / design / office / life / online; validated by script)           |
| Latest release      | [`v0.0.5`](https://github.com/zhang123999-qq/toolbox/releases/tag/v0.0.5) (2026-09-29) — **797 tools**                |
| Current main / live | **798 tools** (drawing-board added after v0.0.5; will be folded into the version number with the next formal release) |

> Registered per group on main: dev 377 · design 203 · office 37 · life 180 · online 1 = **798**;
> 102 of the planned 900 remain.
>
> Note: the `online` group and the 21st category were added after v0.0.5 and their introduction
> is not yet confirmed by the project owner; this table records the current state of the code.

---

## Live demo

The site **is live** and both addresses below are reachable, serving identical content:

| Address                   | Status                                     |
| ------------------------- | ------------------------------------------ |
| <https://006336.xyz/>     | ✅ reachable (primary entry point)         |
| <https://www.006336.xyz/> | ✅ reachable (alias of the primary domain) |

`www` is only an alias: at build time `SITE_ORIGIN` and every page's canonical URL point at the
primary domain, so both addresses serve the same content. The first cold connection to `www` is
occasionally slow — just retry if it times out.

You can also follow "Quick start" below to deploy the site on your own machine and use it
offline — the vast majority of tools run entirely in the browser and need no online service.
Only a handful of network tools (DNS / Whois / HTTP request / Webhook tester) require
connectivity, and even then the browser talks directly to the public endpoint — no request
passes through our servers and no input is collected.

---

## Free and open source / licence & privacy (operating stance)

This project is **free forever, MIT-licensed, local-first: no ads, no paywall/subscription,
no account, no selling of user data, no user-facing tracking.** Only the infrastructure
necessary to run the build is operated. It is run as a public repository with community
contributions that anyone can self-host.

---

## Quick start

Three deployment paths — pick whichever fits the target machine.

### 1. Binary deployment (Linux server, recommended)

The target machine needs only `sh` + `tar` + `systemd` + `nginx`.
**No Node, pnpm, Docker or Go required.**

One-line deploy (the release source defaults to this repository; the raw script URL is
[`install.sh`](https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh)):

```bash
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash
```

> 🔒 **Read it before you run it**: `curl … | bash` hands a remote script straight to your shell.
> Review it first with
> `curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | less`
> (or download it with `curl -fsSLO` and read the file), then run the command above.

> 🌐 **Once installed** it serves on `http://<host>:8081/`. The default port is **8081** (same as
> the Docker form, and it avoids privileged port 80, which is usually taken); use `--port 9090`
> or set `TOOLBOX_PORT=9090` to change it.

Self-hosted / internal release source (the production recommendation — it does not depend on
GitHub reachability; the directory must contain `install.sh`, `latest.txt`, `toolbox-*.tar.gz`
and its `.sha256`):

```bash
# A. Serve a release source from a machine that already has the artifacts
#    (nginx / S3 / any static host works just as well)
cd dist-release && python3 -m http.server 8899

# B. Install on the target machine with a single command
curl -fsSL http://<source-ip>:8899/install.sh | sudo bash -s -- --source http://<source-ip>:8899
```

Common variations:

| Need                        | Extra flag             |
| --------------------------- | ---------------------- |
| Change the port             | `--port 9090`          |
| Install nginx automatically | `--install-deps`       |
| Pin a version               | `--version 0.0.1-beta` |
| Preview the actions first   | `--dry-run`            |

> ✅ **The repository is public**: `releases/latest/download/install.sh` downloads fine
> anonymously (verified, HTTP 200). Use a self-hosted source instead when you need offline
> distribution.

Manual install without the one-liner:

```bash
tar -xzf toolbox-0.0.1-beta-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.1-beta-linux-amd64.tar.gz --install-deps
```

### 2. Container deployment

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .
docker run -d --name toolbox-web -p 8081:8081 toolbox-web:dev   # 8081 inside and out
```

### 3. Local development

```bash
pnpm install --ignore-scripts   # esbuild's postinstall hits EBUSY on some Windows setups
pnpm dev                        # dev server; add --concurrency=1 if you see os error 231
pnpm check:tools                # validate metadata (21 categories, 900 total, counts closed)
pnpm build:ssg                  # client build + SSR build + pre-render every static page (tool pages are generated from their directories)
```

---

## CLI cheat sheet (`toolboxctl`)

Available globally after install (`/usr/local/bin/toolboxctl`).

| Task                            | Command                                         |
| ------------------------------- | ----------------------------------------------- |
| Overview                        | `toolboxctl status`                             |
| Health check                    | `toolboxctl health`                             |
| Start / stop / restart / reload | `toolboxctl start \| stop \| restart \| reload` |
| Logs                            | `toolboxctl logs -f`                            |
| Installed versions              | `toolboxctl list`                               |
| Environment self-check          | `toolboxctl doctor`                             |
| Back up config                  | `toolboxctl backup`                             |
| Check for updates               | `toolboxctl check-update`                       |
| **Upgrade**                     | `toolboxctl upgrade`                            |
| **Roll back**                   | `toolboxctl rollback`                           |
| Uninstall                       | `toolboxctl uninstall [--purge]`                |

> The release source for both upgrade commands defaults to this repository:
> `https://github.com/zhang123999-qq/toolbox/releases/latest/download`.
> Precedence is `--source <base-url>` > `UPDATE_SOURCE` in the config file > that default.
> With a self-hosted source, write `UPDATE_SOURCE='<base-url>'` into
> `/etc/toolbox/toolbox.conf` and you never need to pass the flag again.

Full guide (flags, scenarios, directory layout, troubleshooting):
`install.sh --help` and `toolboxctl --help`.

---

## Target machine requirements (binary deployment)

| Item              | Requirement                                                    |
| ----------------- | -------------------------------------------------------------- |
| OS                | Linux x86_64 / aarch64                                         |
| init              | systemd                                                        |
| Web server        | nginx ≥ 1.21 (`--install-deps` can install it)                 |
| Baseline commands | `sh` `tar` `gzip` `sha256sum` `awk` `sed`, `curl` (or `wget`)  |
| Privileges        | root                                                           |
| Disk              | ≈ 50 MB under `/opt/toolbox` (keeps two versions for rollback) |

The site runs its **own nginx instance** (its own `pid`, logs, temp paths and MIME
table); it borrows only the system nginx _binary_ and never reads `/etc/nginx`.
So `toolboxctl stop` stops this site alone, and uninstalling never disturbs other
nginx sites on the same machine.

---

## Repository layout

```text
packages/catalog/    single source of truth for 21 categories ↔ 5 groups, Zod contract, route derivation
packages/search/     search facade (Orama adapter slot)
apps/web/            Vite 8 + React 19 + TS + Tailwind v4 (i18n / theme / tool registry)
scripts/             catalog generation / metadata validation / sitemap / SSG pre-render / docs consistency check
deploy/docker/       container deployment (multi-stage build + nginx)
deploy/binary/       binary deployment (bundle builder + toolboxctl + one-line installer)
docs/                developer handbook, release process
```

## Stack and page model

- **Engineering**: pnpm monorepo; Vite 8 + React 19 + TypeScript + Tailwind v4; search via
  Orama; tests with vitest + Playwright (driving the system-installed Edge); SSG via React 19
  `prerender` at build time.
- **Bilingual & themes**: Chinese / English switch live on the client (no `/en` route); light &
  dark themes are applied by an inline script before first paint, with no flash.
- **Independent routes (Plan A, implemented)**: 1 tool = 1 route `/tools/<slug>` = 1 lazy
  chunk = 1 static HTML = 1 sitemap entry; routes are derived automatically from the catalog —
  no hand-written route table.
- **Per-page head**: title / description / canonical / Open Graph / Twitter Card (summary) /
  JSON-LD (tool pages `SoftwareApplication` + site-wide `BreadcrumbList`). `og:image` is not
  set yet and is listed as an optional future enhancement.
- **Build output**: mainline `pnpm build:ssg` pre-renders **826 static pages + `404.html`**
  (798 tool pages + 5 group pages + 21 category pages + home + tool index).

## Documentation

| I want to…                    | Read                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Contribute, or add a tool     | [`CONTRIBUTING.md`](CONTRIBUTING.md) + [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) |
| Cut a release, tag, changelog | [`docs/RELEASE.md`](docs/RELEASE.md)                                                |
| See what changed              | [`CHANGELOG.md`](CHANGELOG.md)                                                      |

---

## License

[MIT](LICENSE) © 2026 zhang123999-qq.

Third-party dependencies are permissively licensed as well (MIT / ISC / Apache-2.0 / BSD / CC0,
among others). `pnpm check:licenses` blocks strong copyleft and commercially restricted licenses
such as GPL / AGPL / SSPL / BUSL, so a non-compliant dependency cannot pass CI. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the rules on adding dependencies.
