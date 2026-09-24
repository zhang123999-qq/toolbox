# One-line Install

> [中文](one-line-install.md) | **English**
> For **deployment**: install the Toolbox static site on a Linux server with one command.
> For build and Docker paths see [`../DEVELOPMENT.en.md`](../DEVELOPMENT.en.md) §20; for CLI usage see [`../../deploy/binary/README.md`](../../deploy/binary/README.md).

---

## 1. What it does

[`deploy/binary/install.sh`](../../deploy/binary/install.sh) is an installer that runs straight from a pipe:

```text
curl -fsSL <script-url> | sudo bash -s -- [options]
```

It does only four things, and **the real work is handed to `toolboxctl` inside the bundle** — so the one-line install and a manual unpack-and-install share exactly one code path:

| Stage   | Action                                                                           |
| ------- | -------------------------------------------------------------------------------- |
| Resolve | Pick the version and bundle location (GitHub Releases / release source / local)  |
| Verify  | Compare sha256 after download; a failed check means **no install**               |
| Install | Unpack → `toolboxctl install` → render config → start a dedicated nginx instance |
| Finish  | Place `toolbox` / `toolboxctl` in `--bin-dir` and confirm autostart              |

After install: the site lives in `/opt/toolbox` (`current` symlinks to `releases/<version>`), the commands live in `/usr/local/bin`.

---

## 2. Requirements

### 2.1 System and privileges

| Item  | Requirement                                                         |
| ----- | ------------------------------------------------------------------- |
| OS    | Linux (checked first; anything else exits immediately)              |
| Arch  | `x86_64/amd64` or `aarch64/arm64`                                   |
| User  | **root** (writes `/opt`, `/usr/local/bin`, installs a systemd unit) |
| Shell | `bash` (detected automatically; `curl … \| sh` tells you to switch) |

> A machine without systemd does not fail: the installer falls back to "install files only" (same as `--no-start`), then tells you how to start it by hand.

### 2.2 Required commands

| Command          | Required?   | Notes                                                                               |
| ---------------- | ----------- | ----------------------------------------------------------------------------------- |
| `curl` or `wget` | Yes         | Downloads the script and the bundle                                                 |
| `tar`            | Yes         | Unpacks the bundle                                                                  |
| `sha256sum`      | Yes         | Integrity check (skip with `--no-verify`)                                           |
| `nginx`          | Runtime     | The site runs on a **dedicated nginx instance**; add `--install-deps` to install it |
| `systemctl`      | Recommended | Used for autostart and day-to-day operations                                        |

One command to check everything after install:

```sh
toolboxctl doctor
```

### 2.3 Reaching an install source

Sources are tried in this order; the first match wins:

1. `--from <URL|file>` — use this exact bundle
2. `--source <base-url>` — self-hosted release source (needs `latest.txt`, bundle, `.sha256`)
3. Default — GitHub Releases

> This repository is currently **private**: the default path returns 404 for anonymous requests (verified). Fix it in one of three ways — make the repository public, pass `GITHUB_TOKEN`, or use `--source` / `--from`. See [`../RELEASE.md`](../RELEASE.md) §4.

---

## 3. Options

| Option            | What it does                                                               | Values / default                                            |
| ----------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `-v`, `--version` | Install a specific version; the `v` prefix is optional, space or `=` works | e.g. `-v 0.0.1`, `--version=0.0.1`; default: latest release |
| `--from`          | Use this exact bundle, **skipping version resolution**                     | URL or local file path                                      |
| `--source`        | Self-hosted release source base URL (internal distribution)                | e.g. `http://192.168.1.10:8099`                             |
| `--proxy`         | Download through a proxy                                                   | e.g. `http://127.0.0.1:10808`                               |
| `--mirror`        | GitHub download accelerator prefix; rewrites `github.com` links only       | e.g. `https://ghfast.top`                                   |
| `--service`       | Enable autostart and start now (adds a systemd precheck)                   | Flag; mutually exclusive with `--no-start`                  |
| `--no-start`      | Install files only: no start, no autostart                                 | Flag                                                        |
| `--port`          | Port the site listens on                                                   | Default `80`                                                |
| `--prefix`        | Site install root (does not affect command location)                       | Default `/opt/toolbox`                                      |
| `--bin-dir`       | Directory for the command entry points                                     | Default `/usr/local/bin`                                    |
| `--install-deps`  | Install system dependencies (`apt-get install nginx`)                      | Flag                                                        |
| `--no-verify`     | Skip the sha256 check (not recommended)                                    | Flag                                                        |
| `--dry-run`       | Print the actions without touching the disk                                | Flag                                                        |
| `-h`, `--help`    | Show help                                                                  | —                                                           |

---

## 4. Scenarios

In every example below, `<script-url>` means:

```text
https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh
```

### 4.1 Default install

Installs into `/usr/local/bin` and `/opt/toolbox`, enables autostart and starts the service:

```sh
curl -fsSL <script-url> | sudo bash
```

### 4.2 Specific version

The `v` prefix is optional. Pinning a version skips the "find latest release" lookup, which is what you want on private repositories or offline networks:

```sh
curl -fsSL <script-url> | sudo bash -s -- -v 0.0.1
curl -fsSL <script-url> | sudo bash -s -- --version=v0.0.1
```

### 4.3 Behind a proxy

The proxy is passed to `curl` **and exported to child processes** — so `--install-deps` installs nginx through the same proxy:

```sh
curl -fsSL <script-url> | sudo bash -s -- --proxy http://127.0.0.1:10808
```

Or skip the flag and let the installer pick up the proxy already in the environment:

```sh
export https_proxy=http://127.0.0.1:10808 http_proxy=http://127.0.0.1:10808
curl -fsSL <script-url> | sudo bash
```

If only GitHub is slow and a proxy is inconvenient, use an accelerator prefix instead — it rewrites `github.com` download links only:

```sh
curl -fsSL <script-url> | sudo bash -s -- --mirror https://ghfast.top
```

### 4.4 Autostart

Autostart is on by default. `--service` makes it **explicit**: it adds the systemd precheck and confirms `is-enabled` afterwards:

```sh
curl -fsSL <script-url> | sudo bash -s -- --service
```

The opposite: install files now, start later (for example after editing the port or config):

```sh
curl -fsSL <script-url> | sudo bash -s -- --no-start
# later: systemctl enable --now toolbox.service
```

### 4.5 Combined

Pinned version + proxy + autostart + custom port + automatic dependencies:

```sh
curl -fsSL <script-url> | sudo bash -s -- \
  -v 0.0.1 \
  --proxy http://127.0.0.1:10808 \
  --service \
  --port 8080 \
  --install-deps
```

### 4.6 Release source and local bundle

For internal distribution, serve the release directory statically (it contains `latest.txt`, the bundle, and `.sha256`) and point at it:

```sh
curl -fsSL http://192.168.1.10:8099/install.sh | sudo bash -s -- --source http://192.168.1.10:8099
```

If the bundle is already on the target machine, skip downloading entirely (a local bundle without `.sha256` skips the whole-archive check, but the bundle still verifies file by file):

```sh
curl -fsSL <script-url> | sudo bash -s -- --from /root/toolbox-0.0.1-linux-amd64.tar.gz
```

### 4.7 Dry run first

Add `--dry-run` to any combination to see what would happen, without writing anything:

```sh
curl -fsSL <script-url> | sudo bash -s -- -v 0.0.1 --proxy http://127.0.0.1:10808 --dry-run
```

---

## 5. Environment variables

An explicit option always wins over its environment variable.

| Variable                                                    | Equivalent to | Notes                                                |
| ----------------------------------------------------------- | ------------- | ---------------------------------------------------- |
| `GITHUB_TOKEN`                                              | —             | Needed to read releases from a private repo          |
| `TOOLBOX_REPO`                                              | —             | Overrides the repo, default `zhang123999-qq/toolbox` |
| `TOOLBOX_PROXY`                                             | `--proxy`     | Download proxy                                       |
| `TOOLBOX_MIRROR`                                            | `--mirror`    | Download accelerator prefix                          |
| `http_proxy` / `https_proxy` / `HTTP_PROXY` / `HTTPS_PROXY` | `--proxy`     | Used when nothing is set explicitly                  |

```sh
GITHUB_TOKEN=ghp_xxx curl -fsSL <script-url> | sudo bash -s -- -v 0.0.1
```

---

## 6. Verify

```sh
toolboxctl status          # version / service state / port / health check
toolbox version            # is the entry point usable (toolbox is an alias of toolboxctl)
systemctl is-enabled toolbox.service
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1/    # expect 200
```

---

## 7. Uninstall and rollback

```sh
toolboxctl rollback              # back to the previous version (also automatic on failed upgrades)
toolboxctl list                  # installed versions
toolboxctl uninstall --purge     # full removal (--purge-deps also removes nginx)
```

---

## 8. Troubleshooting

| Symptom                           | Cause and fix                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `root privileges required`        | Add `sudo`, or rerun as root                                                                 |
| `cannot determine latest version` | Private repo or no network. Pin `--version`, or use `--source` / `--from`                    |
| `download failed`                 | Add `--proxy` or `--mirror`; run `--dry-run` first to confirm the script itself is reachable |
| `missing checksum file … .sha256` | Incomplete release source; `--no-verify` if you trust it (not recommended)                   |
| `sha256 check failed`             | Corrupted or tampered bundle — install aborted; re-download or switch source                 |
| `port already in use`             | Pick another `--port`, or free the port first                                                |
| `toolbox: command not found`      | Check that `--bin-dir` is on `PATH`                                                          |
| service did not start             | Run `toolboxctl doctor` and `toolboxctl logs -f`; without systemd, start it manually         |

More symptoms in [`../guide/troubleshooting.md`](../guide/troubleshooting.md).

---

## 9. Differences from the htop-s installer

This script keeps the shape of the htop-s flow (`curl … | sudo bash`, stepped colour output, `--version` / `--service` / `--proxy` / `--prefix` naming) and improves on it:

| Aspect          | htop-s                                | This installer                                                         |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Integrity check | Skipped when `.sha256` is missing     | **Aborts when missing** (only `--no-verify` skips it)                  |
| Download        | Single attempt                        | Retries twice, plus a minimum size check (error pages are not bundles) |
| Proxy scope     | `curl` only                           | Exported to child processes, so `--install-deps` uses it too           |
| Slow networks   | Proxy only                            | Adds `--mirror` accelerator prefix                                     |
| No systemd      | Skips service install with a hint     | Falls back to files-only instead of failing mid-install                |
| Directory flags | `--prefix` conflicts with `--service` | `--prefix` (site root) and `--bin-dir` (commands) are independent      |
| Entry points    | One program name                      | Both `toolbox` and `toolboxctl`, in a configurable directory           |
| Preview         | None                                  | `--dry-run`                                                            |
