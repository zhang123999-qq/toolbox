# Troubleshooting

> [中文](troubleshooting.md) | **English**
> Every entry below is something **actually hit and fixed**, not a list imagined up front. It is
> organised as symptom → cause → fix, so you can search for your symptom directly.

---

## 1. Start with the self-check

Most problems explain themselves here:

```bash
toolboxctl doctor            # target host: deps / ports / disk / privileges / service state
toolboxctl status            # do the versions agree, does health pass
pnpm verify                  # dev machine: metadata + docs + lint + format + types + tests
```

---

## 2. Installation problems

| Symptom                                               | Cause                                                                                       | Fix                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `缺少校验文件 …tar.gz.sha256 —— 出于安全考虑拒绝安装` | the `.sha256` file is missing from the release source                                       | add it; refusing to install unverified is deliberate, do not work around it                                         |
| `下载失败：…` with a GitHub-shaped URL                | the version does not exist, the network is blocked, or `--proxy` / `--mirror` was set wrong | pin an existing `--version`, add `--proxy http://127.0.0.1:10808`, or switch to your own or internal release source |
| `端口 8081 已被占用：…`                               | something else already listens there (most often a container deployment on the same host)   | use `--port 9090`, or free the port first                                                                           |
| `不支持的架构：…`                                     | only amd64 and arm64 are published                                                          | use another host, or build the bundle yourself where the toolchain exists                                           |
| Stuck on "health check" and then failure              | the service never came up, or another process grabbed the port                              | `toolboxctl logs -n 100` and read the nginx error                                                                   |
| `apt-get install nginx` fails                         | no outbound network, or the mirror is unreachable                                           | install nginx yourself and drop `--install-deps`                                                                    |
| `toolboxctl` not found after installing               | installed without root, or `/usr/local/bin` is not on PATH                                  | `ls -l /usr/local/bin/toolboxctl`; call it by absolute path                                                         |

---

## 3. Runtime problems

| Symptom                                                           | Cause                                                                                             | Fix                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/healthz` does not respond                                       | the service is not running, or the port is wrong                                                  | `systemctl status toolbox.service`, `journalctl -u toolbox.service -n 50`   |
| Home page returns `application/octet-stream` and gzip is dead too | a server-level `types { }` block **overrides** the whole MIME table inherited from the http level | delete the server-level `types { }` and inherit `/etc/nginx/mime.types`     |
| `/tools` returns 301 to `/tools/`                                 | `try_files` uses `$uri/`, which triggers the directory trailing-slash redirect                    | use `$uri/index.html` instead                                               |
| Unknown paths return 200 with the home page                       | the fallback is `/index.html`, producing a "soft 404"                                             | fall back with `=404` plus `error_page 404 /404.html`                       |
| Tool pages look empty to crawlers                                 | the SPA is not pre-rendered                                                                       | run `pnpm build:ssg`, or check the image actually runs the SSG step         |
| `.wasm` fails to load                                             | the MIME type is not `application/wasm`                                                           | nginx 1.21+ ships it; make sure no stray `types { }` block is overriding it |

---

## 4. Upgrade and rollback

| Symptom                                                                          | Cause                                                                                                                                                                                 | Fix                                                                                                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| The upgrade succeeded but was reported as a health-check failure and rolled back | `systemctl reload` only hands HUP to the nginx master, which re-reads the config **asynchronously**; the old workers keep serving, so `/healthz` still returns the old version string | the health check must **poll for the target version**; if an older bundle still concludes from a single probe, upgrade with a newer one |
| `status` reports the versions disagree                                           | the config, the `current` symlink and `/healthz` do not match, meaning the last upgrade or rollback was interrupted                                                                   | `toolboxctl rollback` to the previous working version, then upgrade again                                                               |
| Still unhealthy after a rollback                                                 | the older version is itself broken, or the config was edited badly                                                                                                                    | `toolboxctl logs`; if needed, `uninstall` and reinstall                                                                                 |
| Config unchanged after an upgrade                                                | an upgrade only re-points the `current` symlink; it never overwrites `toolbox.conf`                                                                                                   | edit `toolbox.conf`, then `toolboxctl reload`                                                                                           |

---

## 5. Development problems

| Symptom                                                    | Cause                                                                                                        | Fix                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `turbo` fails with `os error 231`                          | concurrent spawning exceeds the Windows sandbox pipe limit                                                   | `--concurrency=1` (already baked into `pnpm build/typecheck/test`)                             |
| `pnpm install` fails in esbuild's postinstall with `EBUSY` | the build script's spawn fails; the binary comes from the platform package anyway                            | `pnpm install --ignore-scripts`                                                                |
| The build cannot empty `dist/`                             | accumulated artifacts trip the bulk-delete guard                                                             | `rm -rf dist dist-ssr` in the foreground, then rebuild                                         |
| `react-router` cannot find the Router context              | `pnpm add react-router` pulled 8.x, creating two instances alongside the 7.x bundled with `react-router-dom` | pin `react-router@^7.1.1`                                                                      |
| Edited `meta.ts` but the English title never appears       | the generator was not re-run, so `tools.generated.ts` lags behind the source                                 | `pnpm generate:catalog`                                                                        |
| The first load pulls the entire tool bundle                | `manualChunks` only named tool chunks, so shared modules landed in the first named chunk                     | explicitly route `src/(i18n\|theme\|lib)` into `app-core`                                      |
| Pre-rendered pages contain only "加载中…"                  | `renderToString` emits the Suspense fallback when it meets `React.lazy`                                      | use React 19's `prerender` from `react-dom/static`                                             |
| The docs check reports broken links or missing anchors     | a heading was renamed or a file moved without updating references                                            | fix each item from `pnpm check:docs`; prefer explicit `<a id>` anchors for cross-section links |

---

## 6. What to include before filing an issue

```bash
toolboxctl version && toolboxctl doctor && toolboxctl status
toolboxctl logs -n 100
uname -a && cat /etc/os-release | head -3
```

For problems on a development machine, also include the full `pnpm verify` output, your Node and
pnpm versions, and whether it reproduces reliably. **Being reproducible** matters far more than
a detailed description.
