# Toolbox · A Library of Online Tools

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/zhang123999-qq/toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/zhang123999-qq/toolbox/actions/workflows/ci.yml)

> **870 client-side online tools** that run entirely in your browser: local-first
> (nothing is uploaded), deployed as plain static files, and registered
> automatically the moment a directory is added.
> Bilingual (Chinese / English) · light & dark themes · no sign-in · offline (planned)

[中文](README.md) | **English**

---

## Status

| Item            | Value                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| Planned tools   | **870 across 20 categories in 4 groups** (validated by script)                            |
| Implemented     | **75** (70 in the text & content category, plus sample tools) — that category is complete |
| Current release | [`v0.0.1`](https://github.com/zhang123999-qq/toolbox/releases/tag/v0.0.1)                 |

---

## Live demo (not launched yet)

The site is **not launched yet**, so the two domains below are currently unreachable. They are
recorded here only as the future live-demo entry points:

| Address                   | Status                   |
| ------------------------- | ------------------------ |
| <https://006336.xyz/>     | not launched yet         |
| <https://www.006336.xyz/> | not launched yet (alias) |

Until launch, follow "Quick start" below to reach the site locally or on your internal network;
after launch these two addresses become the official entry points.

---

## Quick start

Three deployment paths — pick whichever fits the target machine. Step-by-step instructions and
verification steps are in [`docs/guide/getting-started.md`](docs/guide/getting-started.md).

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

| Need                        | Extra flag        |
| --------------------------- | ----------------- |
| Change the port             | `--port 8080`     |
| Install nginx automatically | `--install-deps`  |
| Pin a version               | `--version 0.0.1` |
| Preview the actions first   | `--dry-run`       |

> ✅ **The repository is public**: `releases/latest/download/install.sh` downloads fine
> anonymously (verified, HTTP 200). Use a self-hosted source instead when you need offline
> distribution.

Manual install without the one-liner:

```bash
tar -xzf toolbox-0.0.1-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.1-linux-amd64.tar.gz --install-deps
```

### 2. Container deployment

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .
docker run -d --name toolbox-web -p 8081:80 toolbox-web:dev   # 8080 is often taken
```

### 3. Local development

```bash
pnpm install --ignore-scripts   # esbuild's postinstall hits EBUSY on some Windows setups
pnpm dev                        # dev server; add --concurrency=1 if you see os error 231
pnpm check:tools                # validate metadata (20 categories, 870 total)
pnpm build:ssg                  # client build + SSR build + pre-render 101 static pages
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

Full guide (four scenarios, directory layout, troubleshooting):
[`deploy/binary/README.md`](deploy/binary/README.md).

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
packages/catalog/    single source of truth for 20 categories ↔ 4 groups, Zod contract, route derivation
packages/search/     search facade (Orama adapter slot)
apps/web/            Vite 6 + React 19 + TS + Tailwind v4 (i18n / theme / tool registry)
scripts/             catalog generation / metadata validation / sitemap / SSG pre-render / docs consistency check
deploy/docker/       container deployment (multi-stage build + nginx)
deploy/binary/       binary deployment (bundle builder + toolboxctl + one-line installer)
docs/                usage guides, developer handbook, specifications, release process
```

## Documentation

| I want to…                        | Read                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Browse all docs                   | [`docs/README.md`](docs/README.md)                                                                            |
| Install / use / configure / debug | [`docs/guide/`](docs/guide/README.md)                                                                         |
| Contribute, or add a tool         | [`CONTRIBUTING.md`](CONTRIBUTING.md) + [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)                           |
| Read the source organization rule | [`docs/source-organization.md`](docs/source-organization.md) — one tool, one folder; naming; dependency scope |
| Deploy to a server                | [`deploy/binary/README.md`](deploy/binary/README.md)                                                          |
| Cut a release, tag, changelog     | [`docs/RELEASE.md`](docs/RELEASE.md)                                                                          |
| Check how a term is translated    | [`docs/glossary.md`](docs/glossary.md)                                                                        |
| See what changed                  | [`CHANGELOG.md`](CHANGELOG.md)                                                                                |

---

## License

[MIT](LICENSE) © 2026 zhang123999-qq.

Third-party dependencies are permissively licensed as well (MIT / ISC / Apache-2.0 / BSD / CC0,
among others). `pnpm check:licenses` blocks strong copyleft and commercially restricted licenses
such as GPL / AGPL / SSPL / BUSL, so a non-compliant dependency cannot pass CI. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the rules on adding dependencies.
