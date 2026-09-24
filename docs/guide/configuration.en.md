# Configuration

> [中文](configuration.md) | **English**
> Configuration splits into three layers: **build-time environment variables** (what the artifact
> contains), the **runtime config file** (how it runs) and **browser preferences** (what the user
> sees). They never override each other, and editing the wrong layer is what produces the
> "I changed it but nothing happened" illusion.

---

## 1. The three layers

| Layer      | Carrier                               | Scope                                             | When it takes effect   |
| ---------- | ------------------------------------- | ------------------------------------------------- | ---------------------- |
| Build-time | environment variables / `--build-arg` | artifact contents (canonical, sitemap, site name) | on the next build      |
| Runtime    | `/etc/toolbox/toolbox.conf`           | port, paths, update source                        | on `toolboxctl reload` |
| Browser    | `localStorage`                        | language, theme                                   | immediately            |

---

## 2. Build-time variables

### 2.1 SITE_ORIGIN

This drives the sitemap's `<loc>`, each page's `canonical` and the site address in the JSON-LD.
The default is the production domain `https://006336.xyz` (that site has not launched yet — see
[`getting-started.md`](getting-started.md) §6). Override it when deploying elsewhere:

```bash
SITE_ORIGIN=https://staging.example.com pnpm build:ssg
```

When building with Docker, pass `--build-arg SITE_ORIGIN=https://your-domain`.
**Getting this wrong raises no error** — it just hands search engines a different address, which
is why the only verification is to grep the artifact after building:

```bash
grep -o '<loc>[^<]*' apps/web/dist/sitemap.xml | head -3
```

### 2.2 Package sources and proxies

On Chinese networks pnpm goes through npmmirror (see `.npmrc`). For Docker builds both the base
image and the package sources can be overridden:

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev \
  --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine \
  --build-arg HTTP_PROXY=http://host.docker.internal:10810 \
  --build-arg HTTPS_PROXY=http://host.docker.internal:10810 .
```

Pass the proxy in **both lower and upper case**: corepack and undici only read the lowercase
variables, so passing only the uppercase ones fails silently.

---

## 3. Runtime configuration

### 3.1 The config file

`toolboxctl install` writes `/etc/toolbox/toolbox.conf`. You may edit it by hand and reload:

```sh
# Toolbox 运行配置（由 toolboxctl 维护，可手工微调后 reload）
PREFIX='/opt/toolbox'          # installation root
PORT='80'                      # listening port
NGINX_USER='toolbox'           # system user running the nginx workers
NGINX_BIN=''                   # empty means auto-detect the nginx binary
UPDATE_SOURCE=''               # update source (directory or HTTP base); empty requires --source
SERVICE_NAME='toolbox'         # systemd service name (unit is toolbox.service)
INSTALLED_AT='2026-09-24T11:00:00+08:00'
```

### 3.2 Common edits

```bash
toolboxctl config                  # inspect the effective values first
sudo vi /etc/toolbox/toolbox.conf  # change PORT or UPDATE_SOURCE
toolboxctl reload                  # re-render the config and reload
toolboxctl health                  # confirm it is healthy on the new port
```

Two things to remember when changing the port: ports below 80 need root, and `reload` only
re-reads configuration — it will not open a firewall for you.

---

## 4. nginx and systemd

```text
/etc/toolbox/toolbox.conf             runtime config
/etc/systemd/system/toolbox.service  the systemd unit (rendered from a template)
/opt/toolbox/shared/nginx.conf       the rendered nginx main config
/opt/toolbox/logs/{access,error}.log nginx logs
/opt/toolbox/run/nginx.pid           nginx pid
/opt/toolbox/current -> releases/<v> the active version (atomic switch point)
```

The site runs a **dedicated nginx instance**: its own pid, logs, temp paths and MIME table. It
borrows only the system nginx _binary_ and never reads `/etc/nginx`. So `toolboxctl stop` stops
this site alone, and uninstalling leaves every other site on the machine untouched.

---

## 5. Browser preferences

| key              | Values           | Default            | Written by                                                     |
| ---------------- | ---------------- | ------------------ | -------------------------------------------------------------- |
| `toolbox.locale` | `zh` / `en`      | `zh`               | the language switch; read by the inline script in `index.html` |
| `toolbox.theme`  | `light` / `dark` | follows the system | the theme switch; read by the inline script in `index.html`    |

```js
localStorage.getItem('toolbox.locale') // 'zh'
localStorage.getItem('toolbox.theme') // 'dark'
```

Both keys are defined once in `apps/web/src/lib/prefs.ts`, shared by the inline script and React,
so a mismatch such as writing `toolbox.theme` but reading `theme` cannot happen.

---

## 6. Tool metadata fields

Each tool's `apps/web/src/tools/<slug>/meta.ts` is the source of truth, constrained by a Zod
contract:

```ts
export const meta = {
  id: 'json-formatter', // required: internal unique id
  slug: 'json-formatter', // required: route /tools/<slug>
  title: 'JSON 格式化', // required
  description: '格式化、压缩、校验 JSON', // required
  category: 'data-format', // required: one of the 20 categories
  group: 'dev', // required: one of the 4 groups
  priority: 'P0', // required: P0-P3
  feasibility: 'A', // required: A-E
  template: 'T2', // required: T1-T6
  inputs: ['json'], // required
  outputs: ['json'], // required
  options: ['indent', 'sortKeys'], // required
  deps: [], // required
  worker: false, // required: uses a Web Worker?
  wasm: false, // required: loads WASM?
  api: false, // required: depends on an external API?
  titleEn: 'JSON Formatter', // optional: English title (not one of the 16 required fields)
  descriptionEn: 'Format, minify…', // optional: English description
}
```

After editing you **must** run `pnpm generate:catalog` to rebuild the registry, otherwise
`tools.generated.ts` lags behind the source (the symptom is an English title that never appears,
while type checking stays green).

---

## 7. When each change takes effect

| Changed                 | How it takes effect                              | Verify with                                       |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `SITE_ORIGIN`           | rebuild (`pnpm build:ssg`, or rebuild the image) | `grep <loc> dist/sitemap.xml`                     |
| `SITE_NAME` / site copy | rebuild                                          | open the home page and read the title             |
| `.npmrc` / registry     | re-run `pnpm install`                            | whether `pnpm install --frozen-lockfile` succeeds |
| `meta.ts`               | `pnpm generate:catalog`, then rebuild            | `pnpm check:tools`                                |
| `toolbox.conf`          | `toolboxctl reload`                              | `toolboxctl status`                               |
| browser preference      | immediately                                      | still there after a reload                        |
