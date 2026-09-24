# Toolbox · Developer Guide

> [中文](DEVELOPMENT.md) | **English**

> This is the **hands-on manual**: how to set up, how to build a tool, how to pass the gates.
> Architecture and the full tool inventory live in `spec/` and `catalog/` — this guide does not repeat them.
> Version: v1.0 · 2026-09-23

---

## 0. How This Guide Relates to the Rest

| I want to…                                          | Read this                                            |
| --------------------------------------------------- | ---------------------------------------------------- |
| Set up the environment, run it, build my first tool | **This guide**                                       |
| Understand layering, WASM/Worker strategy           | [`spec/02-技术栈与架构.md`](spec/02-技术栈与架构.md) |
| See the full directory tree                         | [`spec/03-目录结构.md`](spec/03-目录结构.md)         |
| Look up a tool's slug / priority / feasibility      | The matching file under [`tools/`](tools/)           |
| See the 870-tool aggregate stats                    | [`catalog/README.md`](catalog/README.md)             |
| See which decisions are still open                  | [`spec/08-待决事项.md`](spec/08-待决事项.md)         |

---

## 1. Environment

| Component | Required | Verified locally | Mandatory                |
| --------- | -------- | ---------------- | ------------------------ |
| Node.js   | ≥ 20     | v22.22.2         | ✅                       |
| pnpm      | ≥ 9      | 12.3.4           | ✅                       |
| Docker    | ≥ 24     | 29.8.0           | ⚠️ acceptance stage only |
| Git       | any      | —                | ✅                       |
| WSL2      | optional | not enabled      | ❌ not required          |

> **On WSL2**: the orchestration prompt calls for WSL2 Ubuntu 22.04, but this project
> is TypeScript/frontend at its core — **native Windows (Git Bash / PowerShell) handles
> the entire development loop**. Docker is only needed for the final container acceptance
> check. Migrating the environment for this is not worth it.

### Proxy setup (required on restricted networks)

Dependency installs need a proxy. Set it once in your shell startup file:

```bash
# ~/.bashrc or ~/.zshrc — adjust the port to your proxy (10808 locally)
export PROXY=http://127.0.0.1:10808
export http_proxy=$PROXY
export https_proxy=$PROXY

# pnpm / npm (a registry mirror is more reliable than proxying the default registry)
pnpm config set registry https://registry.npmmirror.com
pnpm config set proxy $PROXY
pnpm config set https-proxy $PROXY
```

> ⚠️ Docker pulls use their own proxy setting — configure it in
> Docker Desktop → Settings → Resources → Proxies. Shell env vars do not apply.

---

## 2. Quick Start (5 minutes)

```bash
# 1. Go to the repo root
cd $TOOLBOX_ROOT

# 2. Install
pnpm install

# 3. Start the dev server (default http://localhost:5173)
pnpm dev

# 4. In a second terminal, run the full check
pnpm check:tools    # metadata integrity + duplicate detection
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest unit tests
```

**You're good when**: `/tools/json-formatter` renders the T2 two-column layout,
typing JSON on the left formats it live on the right, and Cmd+K finds "JSON 格式化".

---

## 3. Tech Stack (locked — do not change)

```text
Package mgmt / orchestration   pnpm workspace + Turborepo
Build                          Vite (static output)
Framework                      React 19 + TypeScript
UI                             Tailwind CSS + shadcn/ui
State                          Zustand + TanStack Query
Forms / validation             React Hook Form + Zod
Search                         Orama
Offline                        Workbox + IndexedDB
Testing                        Vitest + Testing Library + Playwright
Heavy tasks                    Web Worker + WASM
Deploy                         Docker + Nginx / Cloudflare Pages
```

> **Vite is the locked choice; Next.js is off the table.** The tradeoff is that SEO
> requires SSG pre-rendering, which must be added in Stage 0.

### WASM modules (9 — all lazy-loaded)

| Purpose              | Module                 | Directory             |
| -------------------- | ---------------------- | --------------------- |
| Image processing     | `photon-rs`            | `src/wasm/photon`     |
| Large / batch images | `wasm-vips`            | `src/wasm/wasm-vips`  |
| AV transcoding       | `ffmpeg.wasm`          | `src/wasm/ffmpeg`     |
| OCR                  | `tesseract.js`         | `src/wasm/tesseract`  |
| PDF write            | `pdf-lib`              | `src/wasm/pdf-lib`    |
| PDF read             | `pdfjs-dist`           | `src/wasm/pdfjs`      |
| Office rendering     | `@neo-office/renderer` | `src/wasm/neo-office` |
| SQLite               | SQLite WASM            | `src/wasm/sqlite`     |
| Local LLM            | `wllama` + WebGPU      | `src/wasm/wllama`     |

**Hard rule**: no WASM may enter the main bundle. Load everything through
`loadWasm()` from `packages/wasm`, which also caches it.

---

## 4. Core Mechanism: catalog as the Single Source of Truth

This is the foundation. Understand it and you understand 80% of the workflow.

```text
meta.ts in each tool directory
        │  (aggregated by scripts/generate-catalog.ts)
        ▼
   packages/catalog
        ├── routes.ts        → route table (generated)
        ├── search-index.ts  → search index (generated)
        ├── categories.ts    → 20 categories
        └── groups.ts        → 4 groups
        │
        ├──→ home page group display
        ├──→ category / group pages
        ├──→ Cmd+K search
        └──→ sitemap.xml
```

**So: adding a tool = create a folder + write `meta.ts`. Everything else is automatic.**
You **never** hand-write a route, edit the home page, or touch the sitemap or search index.

---

## 5. 20 Categories ↔ 4 Groups (authoritative mapping)

When writing `meta.ts`, `category` and `group` must match this table exactly.
`check-tools.ts` enforces it.

|   # | Category (中文)           | `category`      | `group`  | Tools | ID range |
| --: | ------------------------- | --------------- | -------- | ----: | -------- |
|   1 | 文本与内容处理            | `text`          | `dev`    |    70 | 1–70     |
|   2 | 编码 / 加密 / 哈希 / 安全 | `encoding`      | `dev`    |    60 | 71–130   |
|   3 | 数据格式 / 解析 / 转换    | `data-format`   | `dev`    |    60 | 131–190  |
|   4 | 开发 / 运维 / 云原生      | `devops`        | `dev`    |    90 | 191–280  |
|   5 | 时间 / 日期 / 调度        | `datetime`      | `dev`    |    30 | 281–310  |
|   6 | 数学 / 单位 / 金融 / 生活 | `math`          | `life`   |    60 | 311–370  |
|   7 | 随机 / 生成 / 设计        | `random`        | `design` |    50 | 371–420  |
|   8 | 图片 / 图形               | `image`         | `design` |    60 | 421–480  |
|   9 | PDF / Office / 文档       | `pdf`           | `office` |    60 | 481–540  |
|  10 | 音视频 / 媒体             | `media`         | `design` |    45 | 541–585  |
|  11 | AI / LLM                  | `ai`            | `life`   |    30 | 586–615  |
|  12 | 网络 / SEO / 网站         | `seo`           | `dev`    |    50 | 616–665  |
|  13 | 数据可视化                | `visualization` | `design` |    25 | 666–690  |
|  14 | Web3 / 区块链             | `web3`          | `life`   |    25 | 691–715  |
|  15 | 无障碍 / 国际化           | `a11y`          | `life`   |    25 | 716–740  |
|  16 | 自动化 / API / 测试       | `automation`    | `life`   |    30 | 741–770  |
|  17 | 浏览器扩展 / 油猴         | `extension`     | `life`   |    15 | 771–785  |
|  18 | 游戏开发 / 像素           | `game`          | `design` |    20 | 786–805  |
|  19 | 边缘计算 / Serverless     | `edge`          | `life`   |    15 | 806–820  |
|  20 | 教育 / 学习 / 趣味        | `education`     | `life`   |    50 | 821–870  |

**Total check**: `dev` 360 + `design` 200 + `office` 60 + `life` 250 = **870** ✅

> ⚠️ The group description in §6 of the orchestration prompt **conflicts with this table**
> (it leaves 8 categories unassigned). **This table wins** — it is script-verified and sums to 870.

---

## 6. Tool Metadata Contract

### 6.1 Full field list (16, all required)

```ts
// src/tools/json-formatter/meta.ts
import type { ToolMeta } from '@toolbox/catalog'

export const meta: ToolMeta = {
  // —— identity ——
  id: 'json-formatter', // globally unique, kebab-case, = directory name
  slug: 'json-formatter', // URL segment, equals id
  title: 'JSON 格式化', // display name
  description: '格式化、压缩、校验 JSON，支持树形查看',

  // —— classification ——
  category: 'data-format', // must be one of the 20 above
  group: 'dev', // must match category's group
  tags: ['json', 'format', 'validate'], // 2–5, lowercase

  // —— planning & feasibility ——
  priority: 'P0', // P0 | P1 | P2 | P3
  feasibility: 'A', // A | B | C | D | E
  template: 'T2', // T1–T6, see §7

  // —— I/O contract ——
  inputs: ['text'],
  outputs: ['text'],
  options: ['sort', 'indent'],

  // —— execution characteristics ——
  deps: ['jsonc-parser'], // must be installed
  worker: false,
  wasm: false,
  api: false,
}
```

### 6.2 Validation rules (enforced by `check-tools.ts`)

|   # | Rule                                                            |
| --: | --------------------------------------------------------------- |
|   1 | `id` unique, kebab-case, no spaces, no uppercase                |
|   2 | `slug` === `id`                                                 |
|   3 | `category` ∈ the 20 categories                                  |
|   4 | `group` consistent with `category` (per §5)                     |
|   5 | `tags` 2–5 items, all lowercase                                 |
|   6 | `priority` ∈ {P0, P1, P2, P3}                                   |
|   7 | `feasibility` ∈ {A, B, C, D, E}                                 |
|   8 | `template` ∈ {T1, …, T6}                                        |
|   9 | `worker` / `wasm` / `api` consistent with `feasibility` (below) |
|  10 | every entry in `deps` must be declared in `package.json`        |

**Feasibility → boolean mapping (mandatory)**

| feasibility | Meaning                         | worker    | wasm       | api        |
| ----------- | ------------------------------- | --------- | ---------- | ---------- |
| **A**       | Pure JS                         | `false`   | `false`    | `false`    |
| **B**       | WASM                            | as needed | **`true`** | `false`    |
| **C**       | WebCrypto / WebCodecs / Web API | as needed | as needed  | `false`    |
| **D**       | User-supplied API / key         | as needed | as needed  | **`true`** |
| **E**       | Requires a backend              | as needed | as needed  | **`true`** |

> **D and E tools must state their data flow on the page.** That's a red line, not a suggestion.

### 6.3 Slug naming rules

```text
✅ json-formatter   base64-encode   whois-lookup   sitemap-generate
✅ toml-parse       svgo-optimize   semver-compare

❌ base64        —— bare name, collides with npm packages / jargon
❌ jsonFormatter —— camelCase
❌ json_formatter —— snake_case
❌ tool-1        —— non-descriptive
```

Rule: **lowercase + hyphen + descriptive + never collide with an npm package name.**
When it collides, add a semantic suffix.

---

## 7. Page Templates T1–T6

| Template | Name          | Layout                          | For               | Example                                        |
| -------- | ------------- | ------------------------------- | ----------------- | ---------------------------------------------- |
| **T1**   | Single column | input above, output below       | simple generators | `uuid`, `timestamp`, `password-generator`      |
| **T2**   | Two column    | side-by-side, draggable divider | convert / compare | `json-formatter`, `text-diff`, `base64-encode` |
| **T3**   | Multi-panel   | input + options + output        | 3+ parameters     | `regex-tester`, `image-compress`, `loan`       |
| **T4**   | Fullscreen    | canvas + floating toolbar       | canvas / drag     | `image-crop`, `pixel-art`, `map-editor`        |
| **T5**   | Wizard        | stepper + step forms            | multi-step output | `id-photo`, `invoice-gen`, `resume`            |
| **T6**   | Dashboard     | card grid                       | monitoring panels | `seo-audit`, `api-test`                        |

### Selection order (top to bottom, first match wins)

```text
1. Has canvas / drag interaction → T4
2. Multi-step output             → T5
3. Multi-card monitoring panel   → T6
4. 3 or more option parameters   → T3
5. Input and output are isomorphic (convert / diff) → T2
6. Everything else               → T1
```

> The `template` field is **not yet filled in** for the 870 tools.
> **Do not fill it in by hand across all 870 records.** Instead, when you write
> `scripts/check-tools.ts` in Stage 0, ship a rule-based inferrer alongside it:
> derive from `tags` + `description` keywords (`canvas`/`editor` → T4,
> `diff`/`convert` → T2, …), then hand-correct the exceptions. Expect ~80% hit rate.

---

## 8. Adding a Tool: Full Walkthrough

### 8.1 Six steps

```bash
# 1. Create the directory (name = slug)
mkdir -p apps/web/src/tools/json-formatter

# 2. Write the 8 files (see 8.2)
# 3. Regenerate the catalog
pnpm generate:catalog

# 4. Verify locally
pnpm typecheck && pnpm test

# 5. Verify in the browser (routing is already live)
open http://localhost:5173/tools/json-formatter

# 6. Commit (CI runs the full gate)
git add . && git commit -m "feat(tool): add json-formatter"
```

### 8.2 The eight files

```text
src/tools/json-formatter/
├── meta.ts          metadata (required) — see §6
├── schema.ts        Zod input/output validation (required)
├── utils.ts         pure transform(input, options) → output (required)
├── Tool.tsx         UI built on meta.template (required)
├── test.ts          unit tests for utils (required)
├── Tool.test.tsx    component tests (required)
├── e2e.spec.ts      Playwright E2E (required)
└── README.md        purpose/input/output/options/limits/data-flow/examples (required)
```

> `worker.ts` / `wasm.ts` are added as needed (feasibility B / C) and do not count
> toward the 8-file baseline.

### 8.3 What goes in each

**`schema.ts`** — derive types with `z.infer`; never hand-duplicate them

```ts
import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(5_000_000),
})

export const optionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
  sortKeys: z.boolean().default(false),
})

export type Input = z.infer<typeof inputSchema>
export type Options = z.infer<typeof optionsSchema>
```

**`utils.ts`** — pure function: no React, no DOM, no side effects

```ts
import type { Input, Options } from './schema'

export function transform(input: Input, options: Options): string {
  // Must handle three input classes: empty / oversized / malformed
  if (!input.text.trim()) return ''
  try {
    const parsed = JSON.parse(input.text)
    return JSON.stringify(parsed, options.sortKeys ? sortedReplacer : null, options.indent)
  } catch {
    return '' // or throw a structured error the UI renders
  }
}
```

**`Tool.tsx`** — UI assembly only; all logic lives in `utils.ts`

```tsx
import { meta } from './meta'
import { transform } from './utils'

export default function Tool() {
  // Pick the template component from meta.template; never invent a layout
  return <TwoColumn meta={meta} onRun={transform} />
}
```

**Required `data-testid` attributes** (E2E and automated checks depend on them):

```text
input / output / run / clear / copy / download / example
```

**`README.md`** must cover all seven: purpose / input / output / options /
limitations / data flow / examples.

### 8.4 Layering constraints (red lines)

| Constraint                                    | Detail                                                 |
| --------------------------------------------- | ------------------------------------------------------ |
| `utils.ts` stays pure                         | no React, no DOM, no side effects                      |
| `Tool.tsx` holds no business logic            | assemble only; push logic to `utils.ts` or `features/` |
| `worker.ts` / `wasm.ts` must not import React | the execution layer doesn't depend on UI               |
| Tools must not import each other              | hoist shared logic into `features/` or `lib/`          |
| Never bypass the template system              | must use one of T1–T6                                  |

---

## 9. Command Reference

| Command                 | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `pnpm dev`              | start the `apps/web` dev server                              |
| `pnpm build`            | build the whole repo                                         |
| `pnpm build:ssg`        | client build + SSR build + pre-render (= what CI ships)      |
| `pnpm test`             | Vitest unit tests                                            |
| `pnpm test:e2e`         | Playwright E2E                                               |
| `pnpm lint`             | ESLint (one flat config for the whole repo)                  |
| `pnpm lint:fix`         | ESLint, fixing what it can                                   |
| `pnpm format`           | Prettier, writes                                             |
| `pnpm format:check`     | Prettier, check only (what CI runs)                          |
| `pnpm typecheck`        | `tsc --noEmit`                                               |
| `pnpm check:tools`      | metadata integrity + duplicates + template/group validation  |
| `pnpm check:docs`       | docs consistency (pairing / structure / links / glossary)    |
| `pnpm verify`           | the six gates above, in one command — run this before commit |
| `pnpm generate:catalog` | rescan `tools/*/meta.ts` and rebuild the catalog             |
| `pnpm generate:sitemap` | generate `sitemap.xml`                                       |
| `pnpm build:wasm`       | build / copy WASM modules                                    |

> `typecheck` / `test` use pnpm's built-in recursive runner (`pnpm -r`) instead of turbo — both are
> plain fan-outs that need no dependency graph, while turbo reliably trips `os error 231` in
> restricted Windows environments. `build` and `dev` still use turbo (they need the `^build`
> topology); locally prefer `pnpm build:ssg`, which bypasses the orchestrator.

---

## 10. Quality Gates

### 10.1 Per-tool DoD (all must pass)

```text
□ All 8 files present (meta/schema/utils/Tool/test/Tool.test/e2e/README)
□ utils.ts is a pure function
□ Tool.tsx implements meta.template
□ Every interactive element has a data-testid
□ Unit test coverage ≥ 80%
□ Component tests pass; E2E passes
□ chunk < 30KB
□ No any, no console.log
□ Mobile-responsive
□ Accessibility: 0 critical / 0 serious
□ SEO four-pack: Title / Description / H1 / JSON-LD
□ FAQ ≥ 2 entries
□ ≥ 3 internal links to related tools
□ README covers all seven items
```

### 10.2 Site-wide DoD

```text
□ All 870 tools pass the per-tool DoD
□ pnpm lint / typecheck: 0 errors
□ pnpm test: all pass, coverage ≥ 80%
□ pnpm build succeeds
□ pnpm playwright test: all pass
□ First-load JS < 50KB; tool page JS < 30KB
□ LCP < 2.5s / TBT < 200ms / CLS < 0.1
□ Lighthouse: home ≥ 95, tool pages ≥ 90
□ Docker image builds, runs, and serves
□ sitemap.xml contains all 870 tool pages; robots.txt correct
□ PWA works offline
□ Reachable in production
```

### 10.3 CI pipeline (`.github/workflows/ci.yml`)

Runs in order, **stopping at the first failure**:

```text
pnpm check:tools → pnpm check:docs → pnpm lint → pnpm format:check
                 → pnpm typecheck → pnpm test → pnpm build:ssg
```

The local equivalent is `pnpm verify` (the first six; `build:ssg` is slow and run separately).
Note the CI `push` trigger lists **master** (the default branch) alongside main — if the default
branch is ever renamed, update `.github/workflows/ci.yml` too, or push-triggered CI silently stops
running.

A separate `lighthouse.yml` covers performance / SEO / accessibility.

### 10.4 Engineering config and the recorded exceptions

| File               | What it governs                                                                   |
| ------------------ | --------------------------------------------------------------------------------- |
| `.editorconfig`    | live editor behaviour (indent / newline / encoding); not part of a build          |
| `.prettierrc.json` | the **only** authority on formatting (no semicolons, single quotes, 100 cols, LF) |
| `.prettierignore`  | keeps generated files, lockfiles and binaries out of formatting                   |
| `eslint.config.js` | correctness and accessibility (flat config, one file for the whole repo)          |
| `.gitattributes`   | normalises line endings to LF; marks generated files as `linguist-generated`      |

The split is deliberate: **Prettier owns formatting, ESLint owns correctness, and the two rule sets
do not overlap** — so neither tool can ever undo the other. Do not argue about formatting in review
either; run `pnpm format` once and the disagreement disappears.

There are exactly **two intentional rule exemptions**, both explained in `eslint.config.js`:

- `react-refresh/only-export-components` is off for `src/i18n/**` and `src/theme/**`: a Context
  Provider and the hook that consumes it must share the same Context object, so splitting the file
  only adds a forwarding layer.
- `react-hooks/static-components` is off for `pages/ToolPage.tsx`: the page must resolve components
  by id at runtime (`import.meta.glob`), and the rule cannot see across the function boundary that
  the result is cached per id and therefore stable.

The generated `packages/catalog/src/tools.generated.ts` is ignored by both Prettier and ESLint: it
is produced by `pnpm generate:catalog`, so editing it is meaningless — edit each tool's own
`meta.ts` instead.

### 10.5 Eight red lines

1. **Never hand-write the route table** — the catalog generates it
2. **Never bundle WASM into the main chunk** — always lazy-load
3. **Never skip input validation** — everything goes through Zod
4. **Never hide the data flow when `api: true`** — the page must state "requires your own API/key"
5. **Never upload user data** — local-only processing is the entire point of this project
6. **Never import one tool from another** — hoist shared logic
7. **Never bypass the template system** — must use one of T1–T6
8. **Never add standalone tag or sub-category pages** — use query parameters

---

## 11. Performance Budget

| Metric        |      Budget | Strategy                                                                                   |
| ------------- | ----------: | ------------------------------------------------------------------------------------------ |
| First-load JS |      < 50KB | home page loads categories + top-20 popular only                                           |
| Tool page JS  |      < 30KB | one chunk per tool, loaded on demand                                                       |
| Search index  | < 50KB gzip | generated at build time; id/title/tags only (adding `description` needs a budget re-check) |
| WASM          |        lazy | downloaded on first use, CacheFirst                                                        |
| LCP           |      < 2.5s | static-rendered home hero                                                                  |
| TBT           |     < 200ms | heavy work into Workers                                                                    |
| CLS           |       < 0.1 | reserve height for the tool area                                                           |

**When over budget**: chunk too big → split / lazy-load; LCP slow → preload + inline
critical CSS; TBT high → Worker + deferred execution; CLS high → reserve dimensions;
images heavy → WebP/AVIF.

---

## 12. SEO Requirements (per tool page)

```text
1. Title        ≤ 60 characters
2. Description  ≤ 160 characters
3. H1 + body    <h1>Tool name</h1> plus a descriptive paragraph
4. JSON-LD      three blocks: SoftwareApplication + FAQPage + BreadcrumbList
5. FAQ          2–4 entries
6. Internal links  3–5 related tools
```

Generated assets: `sitemap.xml` (script), `robots.txt` (static), `rss.xml` (optional).

> ⚠️ Vite ships an SPA, which search engines crawl poorly by default.
> **Stage 0 must include an SSG pre-rendering solution**, otherwise the 870 tool pages
> are effectively invisible to crawlers and the SEO goal fails outright.

---

## 13. Locked Decisions

|   # | Item                              | Decision                                                                                 | Basis                                                                                 |
| --: | --------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
|   1 | Framework                         | **Vite** (not Next.js)                                                                   | orchestration prompt §4                                                               |
|   2 | Tool granularity                  | **870 independent routes** (`/tools/:slug`)                                              | orchestration prompt §6 URL spec                                                      |
|   3 | 4 groups ↔ 20 categories          | **Use the §5 table**                                                                     | script-verified, sums to 870                                                          |
|   4 | Execution host                    | **Native Windows**, no WSL2 migration                                                    | frontend builds need no Linux                                                         |
|   5 | Batch sizes                       | **B2=662 / B3=59 / B4=79 / B5=58 / B6=12**                                               | measured feasibility distribution, not the old estimates                              |
|   6 | i18n scope                        | **Bilingual (zh/en) with instant client-side switching** (no longer "reserve keys only") | product requires a bilingual entry point, see §19                                     |
|   7 | Theme                             | **Manual light/dark toggle**, defaults to the system preference                          | the product needs a light/dark theme, see §19                                         |
|   8 | Where the locale preference lives | **localStorage**, no `/en` route prefix                                                  | the requirement is "switch instantly + survive refresh", not an SEO multi-locale site |

> Decision 6 supersedes the earlier "Chinese-only" stance: `MessageKey` is derived from the
> Chinese source, and the English bundle is declared as `Record<MessageKey, string>` —
> a missing translation fails typecheck.

---

## 14. Open Decisions (confirm before starting)

|     # | Item                                                  | Recommendation                                                                     | Blocks  |
| ----: | ----------------------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| ~~A~~ | ~~i18n scope: Chinese-only vs bilingual~~             | **Decided (decision 6): bilingual with instant switching**                         | —       |
|     B | **Which category was merged in "21 → 20"**            | Unrecoverable; note "the current 20 stand" and close it                            | Stage 0 |
|     C | **WASM delivery**: self-hosted vs public CDN          | Self-host large modules (ffmpeg/vips/wllama); public CDN acceptable for small ones | Stage 2 |
|     D | **Data-flow notice styling for D tools** (58 of them) | Top banner + in-page card                                                          | Stage 2 |

---

## 15. Known Documentation Conflicts (this guide is authoritative)

Cross-checking the specs surfaced the inconsistencies below. **The spec sources have not
been revised yet** — follow this section when executing.

|   # | Location                                | Conflict                                                                                      | This guide uses                                                                                               |
| --: | --------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
|   1 | `docs/审核报告.md` line 4               | References `.workbuddy/2026-09-23-17-52-10/docs/`, which no longer exists (moved to `F:/max`) | current actual path                                                                                           |
|   2 | `spec/03` §3 tool directory spec        | Still lists `worker.ts`/`wasm.ts` in the 8-file baseline                                      | `spec/09` audit #4: baseline is meta/schema/utils/Tool/test/Tool.test/e2e/README; worker/wasm added as needed |
|   3 | `spec/02` §7 open item                  | Recommends "multi-tab merging"                                                                | Superseded by decision #2 (870 independent routes) — **void**                                                 |
|   4 | `spec/07-路线图.md` prerequisites table | Lists 8 items, doesn't reflect locked #1 / #3                                                 | Follow the decision log in [`spec/08-待决事项.md`](spec/08-待决事项.md)                                       |
|   5 | `spec/05` gap list                      | `Mock API` counted twice (§1 and §4)                                                          | Unique modules are **66**, not 67                                                                             |
|   6 | `spec/09` §7 batch sizes                | States 640/90/80/45/15                                                                        | Measured **662/59/79/58/12**                                                                                  |

---

## 16. Troubleshooting

| Symptom                               | Cause                                                | Fix                                                             |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm install` hangs / times out      | No proxy, or registry not mirrored                   | Set `PROXY` + npmmirror                                         |
| New tool page 404s                    | `generate:catalog` not run, or `id` ≠ directory name | Run `pnpm generate:catalog`; check the id                       |
| `check:tools` reports group mismatch  | `category`/`group` don't match the §5 table          | Fix against the table                                           |
| `check:tools` reports undeclared deps | A package in `meta.deps` isn't installed             | `pnpm add` first, then put it in meta                           |
| Chunk over 30KB                       | Tool imports a large library directly                | Dynamic import, or hoist to a shared `features/` chunk          |
| WASM fails to load                    | Wrong MIME type, or missing COOP/COEP headers        | Check `assetsInclude` in `vite.config.ts` and `types` in Nginx  |
| New tool missing from search          | Index not rebuilt                                    | Run `pnpm generate:catalog` (the index builds with the catalog) |
| E2E can't find a selector             | Missing `data-testid`                                | Add the 7 required testids                                      |

---

## 17. Recommended Build Order

Do not start by mass-generating all 870 tools. Suggested sequence:

```text
Stage 0  Skeleton     Turborepo + Vite + packages/catalog + route generation
                      + search index + CI
                      ↓ acceptance: one sample tool registered (json-formatter),
                        T2 template renders, 4-group nav works, Cmd+K finds it, CI green
Stage 1  P0, 148      pure-frontend high-frequency — validates the architecture
Stage 2  P1, 322      WASM / medium complexity
Stage 3  P2, 332      API-based, all with data-flow notices
Stage 4  P3, 68 + PWA wrap-up
```

**The Stage 0 acceptance gate is critical.** Scaling up before the skeleton works
means multiplying the same mistake across ~7,000 files.

---

## 18. Stage 0 Implementation Status (2026-09-23, deployment added 2026-09-24)

### 18.1 What exists

```text
packages/catalog     20-category source table / 4 groups / Zod contract
                     / route generation / search index
packages/search      search facade (Orama adapter slot reserved)
apps/web             Vite 6 + React 19 + TS + Tailwind v4
                     routes generated from the catalog (red line #1 enforced)
components           Header / SearchDialog (Cmd+K) / ToolShell / ToolCard
                     layout/{ThemeToggle,LanguageSwitch,Footer} / ui/icons
templates            T2 two-column (T1, T3–T6 pending)
i18n/                messages.zh (source of truth) / messages.en / catalog-text / Provider (see §19)
theme/               light-dark theme provider (see §19)
lib/                 prefs (storage keys) / useIsomorphicLayoutEffect / useDocumentTitle
tools/               json-formatter (#131, all 8 files)
scripts/             generate-catalog / check-tools / generate-sitemap / prerender
apps/web/src/        entry-server.tsx (SSG pre-render entry)
deploy/docker/       Dockerfile (multi-stage, includes SSG) + docker-compose.dev.yml
deploy/nginx/        default.conf (SPA fallback + gzip + caching + WASM MIME)
deploy/binary/       binary deployment: build-bundle.sh / toolboxctl / install.sh / tests
                     (third path, see §20; verified on a real server, all four scenarios)
apps/web/public/     sitemap.xml / robots.txt
.github/workflows/   ci.yml (includes SSG steps)
```

### 18.2 Measured gate results

| Gate                    | Result                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:tools`      | ✅ 20 categories total 870; dev 360 / design 200 / office 60 / life 250                                                                                                               |
| `pnpm typecheck`        | ✅ catalog / search / web: 0 errors                                                                                                                                                   |
| `pnpm test`             | ✅ **31 passed** (json-formatter 8+7, home page 7, preference controls 9)                                                                                                             |
| `pnpm build`            | ✅ tool chunk **5.08KB** (gzip 2.08KB), under the 30KB budget; `app-core` 23.45KB (gzip 9.10KB)                                                                                       |
| Route smoke test        | ✅ `/`, `/tools`, `/c/dev`, `/c/dev/data-format`, `/tools/json-formatter` all 200                                                                                                     |
| `generate:catalog`      | ✅ rescans `tools/*/meta.ts`, rebuilds the registry, passes re-validation                                                                                                             |
| Docker image            | ✅ `toolbox-web:dev` builds and runs; all 7 routes return 200 in-container, healthcheck `healthy`                                                                                     |
| Nginx headers           | ✅ html `text/html; charset=utf-8`; JS `Content-Encoding: gzip` + `max-age=31536000, immutable`; `.wasm` → `application/wasm`                                                         |
| **SSG pre-rendering**   | ✅ 27 static pages + `404.html`; tool pages contain real DOM (`data-testid="input"`) with **no** Suspense fallback; title / description / canonical / JSON-LD all injected            |
| **Bilingual switching** | ✅ Chinese by default; switching to English updates home / nav / footer / tool page copy plus `<html lang>` and `document.title`; persisted to `localStorage` and kept across reloads |
| **Light-dark theme**    | ✅ toggling applies `<html class="dark">` and persists to `localStorage`; applied pre-paint by an inline script, so there is no flash                                                 |

### 18.3 Environment gotchas (native Windows)

| Symptom                                         | Cause                                                                           | Fix                                                                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_IGNORED_BUILDS`                       | pnpm 10+ skips build scripts by default                                         | Put `allowBuilds: esbuild: true` in `pnpm-workspace.yaml` — **not** the `pnpm` field in `package.json`, which pnpm 12 no longer reads                                                                    |
| esbuild postinstall `EBUSY`                     | sandbox blocks spawn; the `--version` check fails                               | `pnpm install --ignore-scripts`. The binary ships in the `@esbuild/win32-x64` platform package; postinstall only validates it                                                                            |
| turbo `os error 231` (pipe instances exhausted) | concurrent spawn exceeds the sandbox pipe limit; reproduces reliably on Windows | `typecheck` / `test` now use `pnpm -r`; `build` / `dev` still use turbo, so locally prefer `pnpm build:ssg`, or bypass the orchestrator per package with `pnpm exec tsc -p <pkg>/tsconfig.json --noEmit` |

**Three more gotchas at Docker build time (already encoded in `deploy/docker/Dockerfile`):**

| Symptom                                                              | Cause                                                                                                                                         | Fix                                                                                                                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base name (${NGINX_IMAGE}) should not be blank`                     | ARG declared inside a stage is stage-scoped, so the second `FROM` cannot see it                                                               | Declare both `ARG`s **before the first `FROM`**                                                                                                                               |
| `Could not reach registry.npmjs.org/@pnpm/exe...`                    | corepack downloads the pnpm binary from npmjs by default                                                                                      | Set `COREPACK_NPM_REGISTRY` in the Dockerfile (defaults to npmmirror). Pass proxy build args in **both upper and lower case** — corepack/undici reads only the lowercase ones |
| Home page returns `application/octet-stream`, gzip silently disabled | a server-level `types { }` block **overrides** the entire MIME table inherited from the http level                                            | Drop the server-level `types { }` and inherit `/etc/nginx/mime.types` (nginx 1.21+ already ships `application/wasm`). Also note `include` is not allowed _inside_ `types { }` |
| `/tools` returns **301** → `/tools/`, clashing with canonical        | `$uri/` in `try_files $uri $uri/` triggers the index module's automatic trailing-slash redirect                                               | Use `try_files $uri $uri/index.html` and never `$uri/`                                                                                                                        |
| A mistyped URL returns **200 with the home page** (soft 404)         | When the fallback is `/index.html`, every unmatched path is silently replaced by the home page and the SSG-generated `404.html` is never used | `try_files $uri $uri/index.html **=404**;` plus `error_page 404 /404.html;` and `location = /404.html { internal; }` so unknown paths really return a 404 status              |

> Docker Hub may be blocked on some networks. Override the base image with
> `--build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine`;
> the Dockerfile default stays on the official registry (for CI).

**Two SSG gotchas:**

| Symptom                                                                   | Cause                                                                                                                                                      | Fix                                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Cannot destructure property 'basename' of useContext(...) as it is null` | `pnpm add react-router` resolved to **8.x**, creating a second instance alongside the 7.x that `react-router-dom` bundles — the Router contexts never meet | Pin it: `react-router@^7.1.1`, so only one `react-router` exists under `.pnpm`       |
| Pre-rendered output is all "加载中…"                                      | `router.tsx` / `ToolPage` use `React.lazy`; `renderToString` only emits the Suspense fallback                                                              | Use React 19's `prerender` from `react-dom/static`, which awaits Suspense resolution |

**Chunking gotcha (new — read this before scaling to 870 tools):**

| Symptom                                                                                                   | Cause                                                                                                                                                                                                                                                     | Fix                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The entry chunk statically imports a **tool chunk**, forcing the first load to pull the whole tool bundle | When `manualChunks` names only tool modules and returns `undefined` for everything else, rollup dumps every shared-but-unnamed module (i18n, for instance) into the **first named chunk** — here `tool-json-formatter` — and the entry then depends on it | Name the shared infrastructure explicitly: `/src/(i18n\|theme\|lib)/` → `app-core` (excluding `node_modules` so dependency-internal `src/lib` folders are not caught). Verify by checking that the entry chunk's static imports contain no `tool-` |

> With a single tool this shows up as "tool chunk 13.6KB → 5.1KB, entry carries 23KB more".
> Left unfixed across 870 tools, shared code keeps piling into an arbitrary tool chunk,
> making the "< 30KB per tool page" budget meaningless.

### 18.4 Not yet implemented

| Item                                  | Note                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ESLint                                | `pnpm lint` not wired up (the CI step is commented out)                                           |
| Orama proper                          | currently lightweight substring matching; Chinese tokenization needs `@orama/tokenizers/mandarin` |
| Pinyin / alias search                 | needs `pinyin-pro`; required by spec §6                                                           |
| shadcn/ui                             | currently hand-rolled minimal components                                                          |
| T1 / T3–T6 templates                  | only T2 exists                                                                                    |
| PWA / Worker / WASM                   | Stage 2 onward                                                                                    |
| English tool metadata                 | only json-formatter has `titleEn` / `descriptionEn`; the rest fall back to Chinese                |
| `/en` routes and English static pages | static output stays Chinese (the primary SEO market); English only applies client-side            |

### 18.5 Budget conflict (new — needs a decision)

**The < 50KB first-load JS budget conflicts with the React 19 stack.**

Measured first-load chunk: **262KB (gzip 84KB)**; with bilingual copy and theming it is now
**entry 267.8KB (gzip 85.5KB) + app-core 23.5KB (gzip 9.1KB) ≈ gzip 94.6KB**.
After optimization — moving zod out of the first-load path (−61KB), route-level lazy loading,
and splitting pages and preference controls into their own chunks — it is still ~89% over.
Baseline: React 19 + react-dom ≈ 140KB (gzip ~45KB), React Router ≈ 30KB (gzip ~10KB),
bilingual catalogue ≈ 20KB (gzip ~9KB).
**The framework alone exceeds 55KB gzip, permanently over budget.**

Three ways out — pick one:

1. **Relax the budget** to gzip < 120KB (pragmatic; recommended)
2. **Swap the runtime**: Preact/compat instead of React (≈ −100KB, but departs from the locked stack)
3. **Restructure**: SSG pre-rendering + islands architecture (expensive, but gets both SEO and size)

> Recommendation: **1**. This is a tool site — the value is in the tools, not in first-load
> bytes. SPA first-load JS necessarily contains the framework, so 50KB is unreachable on
> React 19; enforcing it only produces fake optimizations.

---

## 19. Bilingual Copy and Theme (added 2026-09-24)

### 19.1 Requirements and where they live

| Requirement                                  | Implementation                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Switch between Chinese and English instantly | hand-rolled lightweight i18n in `src/i18n/`; switching re-renders in place, no navigation              |
| All visible copy follows the language        | every string — including group names, category names and feasibility labels — goes through an i18n key |
| Light / dark theme toggle                    | `src/theme/` plus Tailwind v4 `@custom-variant dark`                                                   |
| Preferences survive a reload                 | `localStorage`: `toolbox.locale` / `toolbox.theme`                                                     |

Both controls sit in the header's right cluster, right after `SearchDialog`, and share the
appearance constants in `components/layout/controls.ts`: same `h-8` height, same radius, same
border colour. On mobile the search button collapses to an icon, the language control becomes a
compact `中 | EN` segmented control, and the theme control is a square icon button. All three stay
in the top bar rather than moving into the collapsed menu, and the whole row still fits at 360px.

### 19.2 Type-safe message keys

```
messages.zh.ts   → export const zh = {...} satisfies Record<string,string>
                   export type MessageKey = keyof typeof zh   ← single source of truth
messages.en.ts   → export const en: Record<MessageKey, string>
```

- **A missing translation breaks the build**: drop a key from the English bundle and
  `tsc --noEmit` fails.
- **Dynamic keys stay checked**: `t(`group.${id}.name`)` resolves to the four concrete keys via
  template-literal types, so a wrong prefix surfaces at the type level.
- **Interpolation**: `t('featured.stage', { live, planned, percent })`, placeholders as `{name}`.

### 19.3 Avoiding a first-paint flash (the important part)

| Preference | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme      | It is just a class on `<html>`, written by the inline script in `index.html` **before first paint**; React stays out of the first frame. Icons use `dark:hidden` / `hidden dark:block` so CSS picks one, removing any window where React state and the real theme disagree                                                                                                                                                 |
| Language   | The first render always uses the default Chinese, matching the SSG output; `useIsomorphicLayoutEffect` then syncs the stored preference **before paint**. If the remembered language is not Chinese, the inline script first applies `html.i18n-pending` to cover the pre-rendered Chinese, and the provider removes it once ready (a 3s fallback timer prevents the content from staying hidden if the script misbehaves) |

> `useIsomorphicLayoutEffect` (in `src/lib/`): `useLayoutEffect` on the client, `useEffect` on the
> server, so SSG does not log "does nothing on the server".

### 19.4 How data-shaped copy is handled

| Kind                                                             | Approach                                                                         | Why                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Group / category / feasibility labels (29 values, a closed enum) | live in the i18n layer as `group.*` / `category.*` / `feasibility.*`             | keeps copy in one place and the catalog as pure data                                                          |
| Tool titles and descriptions (per-item content)                  | `ToolMeta` gains **optional** `titleEn` / `descriptionEn`; falls back to Chinese | per-item content belongs in each tool's own `meta.ts`; being optional means existing tools validate untouched |
| Search index                                                     | still built from the Chinese metadata, **localised at render time**              | the index is a single build-time artifact; duplicating it per language is wasteful                            |

> `titleEn` / `descriptionEn` **do not count towards the 16 required fields** in §6 — they are
> `.optional()` in `toolMetaSchema`, so `check-tools` behaves exactly as before.

### 19.5 Notes for adding or changing a tool

1. Never hardcode Chinese copy in a component — pull it through `useTranslate()`. Move constant
   arrays that hold copy (such as `Highlights`' `HIGHLIGHTS`) inside the component body, or they
   will keep the old text after a language switch.
2. To add a new string, add the key to `messages.zh.ts` first; `messages.en.ts` will immediately
   fail as an incomplete `Record<MessageKey, string>`.
3. **Do not convert CSS-decided state into React conditional rendering** (the theme icons, for
   example) — that reintroduces the possibility of a first-frame mismatch.
4. After touching anything under `src/i18n/`, `src/theme/` or `src/lib/`, confirm
   `manualChunks` in `vite.config.ts` still routes it to `app-core` (see the chunking gotcha in §18.3).

---

## 20. Deployment and Release (three paths)

### 20.1 Which one to pick

| Path        | Location                 | Target machine needs             | Good for                                                    |
| ----------- | ------------------------ | -------------------------------- | ----------------------------------------------------------- |
| From source | repo root `package.json` | Node 20+ / pnpm / the source     | development, CI                                             |
| Container   | `deploy/docker/`         | Docker                           | self-hosting, scale-out                                     |
| **Binary**  | `deploy/binary/`         | `sh` + `tar` + `systemd` + nginx | single-server rollouts, internal servers, Docker-free hosts |

All three ship **exactly the same artifact** (the static files in `apps/web/dist`);
they differ only in how that artifact is delivered and operated.

### 20.2 Binary deployment: three commands are all you need

```bash
# Install (root required on the target)
curl -fsSL <release-source>/install.sh | sudo sh -s -- --source <release-source>

# Inspect
toolboxctl status && toolboxctl health

# Upgrade / roll back / uninstall
toolboxctl upgrade --source <release-source>
toolboxctl rollback
toolboxctl uninstall --purge
```

> ⚠️ This repository is currently **private**: anonymous requests to
> `raw.githubusercontent.com` and to release assets both return **404** (verified).
> Fix it by making the repo public, passing `GITHUB_TOKEN` at install time, or hosting
> your own / internal release source — the production recommendation.

### 20.3 Layout and rollback

```text
/opt/toolbox/
├── releases/<ver>/     immutable: unpack and go; an upgrade only adds a directory
├── current -> …        the single switch point (symlink, replaced atomically)
├── shared/             survives upgrades: rendered nginx.conf / unit / state
├── logs/  run/         nginx logs and pid
├── /etc/toolbox/toolbox.conf   runtime config (PREFIX / PORT / update source)
└── /usr/local/bin/toolboxctl   global CLI (symlink into current/bin)
```

An upgrade = unpack into a new directory + atomically re-point the symlink; if the config
fails syntax validation or the health check, the symlink goes straight back.
The CLI runs its **own nginx instance** (own pid, logs, temp paths and MIME table), borrowing
only the system nginx _binary_ and never reading `/etc/nginx` — so `stop` stops this site
alone and uninstalling never disturbs other sites on the same host.

### 20.4 Cutting a release

`deploy/binary/VERSION` (source of truth) → `deploy/binary/build-bundle.sh` →
`git tag vX.Y.Z` → `gh release create` (the assets _are_ the artifact).
The one-line install entry point always points at the **`install.sh` release asset**
(tied to a tag, so it cannot drift with a branch).
The five places a version number lives, plus changelog guidance, are in
[`RELEASE.md`](RELEASE.md) §1 / §3.

### 20.5 Where to read more

| I want to…                                       | Read                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Install with one line                            | repo root [`README.md`](../README.md) "Quick start" · §20.2 above |
| The full guide to the four scenarios             | [`../deploy/binary/README.md`](../deploy/binary/README.md)        |
| Build, tag, publish a release, write a changelog | [`RELEASE.md`](RELEASE.md)                                        |
| Container details and nginx gotchas              | §18.3 above                                                       |
