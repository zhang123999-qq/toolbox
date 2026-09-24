# Static Tool Site · Documentation Hub

> Status: **stage 0 complete** (skeleton + sample tool + bilingual/theme support + container and
> binary deployment paths)
> Updated: 2026-09-24
> Tools: **870 across 20 categories in 4 groups** (1 implemented)

> [中文](README.md) | **English**

---

<a id="quick-start"></a>

## 0. Quick start

One command installs it on a Linux server (the target machine needs only `bash` + `tar` +
`systemd` + `nginx` — no Node, pnpm or Docker):

```bash
curl -fsSL <release-source>/install.sh | sudo bash -s -- --source <release-source>
```

The details live in the four usage guides rather than here — open the one you need:

| I want to…                                                          | Read                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| get it running via any of the three paths                           | [`guide/getting-started.md`](guide/getting-started.md)                                                                   |
| learn the site (search / language / theme) and the CLI              | [`guide/usage.md`](guide/usage.md)                                                                                       |
| change the port, update source, or deploy to the production domain  | [`guide/configuration.md`](guide/configuration.md)                                                                       |
| fix an install, startup or upgrade failure                          | [`guide/troubleshooting.md`](guide/troubleshooting.md)                                                                   |
| look up every one-line install option (version / proxy / autostart) | [`deploy/one-line-install.md`](deploy/one-line-install.md)                                                               |
| look up every `toolboxctl` command                                  | [`../deploy/binary/README.md`](../deploy/binary/README.md) · the CLI cheat sheet in the root [`README.md`](../README.md) |
| contribute code                                                     | [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                                                                               |

> ⚠️ The repository is currently **private**, so anonymous requests to both
> `raw.githubusercontent.com` and release assets return **404** (verified). To use GitHub as the
> release source: ① make it public; ② pass `GITHUB_TOKEN` while installing; ③ host your own or an
> internal release source (the production recommendation).

---

## 1. Documentation map

```text
<repository root>
├── README.md                    ← project landing page: positioning / quick start / CLI cheat sheet (English README.en.md)
├── CONTRIBUTING.md              ← contributing guide: environment / conventions / workflow / gates (English CONTRIBUTING.en.md)
├── CHANGELOG.md                 ← change log
└── docs/                        ← everything below is the documentation directory
├── README.md                    ← this file · documentation hub
├── glossary.md                  ← glossary: Chinese–English pairs + forbidden translations (the checker's source of truth)
├── guide/                       usage guides (four documents for users and operators)
│   ├── README.md                guide index
│   ├── getting-started.md       installation and quick start (three deployment paths)
│   ├── usage.md                 usage examples (site / CLI / library)
│   ├── configuration.md         configuration (build-time / runtime / browser)
│   └── troubleshooting.md       troubleshooting (symptom → cause → fix)
├── deploy/                      deployment layer: the one-line installer and its docs
│   ├── one-line-install.md      one-line install: options / scenarios / troubleshooting (.en.md)
│   └── (the script itself lives in deploy/binary/install.sh)
├── DEVELOPMENT.md               ← developer handbook (Chinese): environment / adding tools / gates
├── DEVELOPMENT.en.md            ← Developer Guide (English, same structure)
├── RELEASE.md                   ← release process: version identity / building a release / changelog notes / one-line install
├── 审核报告.md                   ← documentation review record from an early round (historical archive)
├── spec/                        specification layer: architecture, conventions, roadmap
│   ├── README.md                project overview (formerly 00-overview)
│   ├── 01-域与子类全景.md        the 20 categories plus 60+ sub-categories
│   ├── 02-技术栈与架构.md        technology choices, seven-layer architecture, WASM, Workers
│   ├── 03-目录结构.md            the full monorepo tree
│   ├── 04-开发规范.md            adding a tool, meta.ts, red lines
│   ├── 05-缺口清单.md            the high-value gaps to fill
│   ├── 06-网页结构与信息架构.md   three-layer IA, 6 templates, three-layer search, SEO
│   ├── 07-路线图.md              the stage 0–4 rollout plan
│   ├── 08-待决事项.md            ⚠️ the 8 decisions required before starting
│   ├── 09-执行编排提示词.md      the full execution prompt (DAG / batches / roles / DoD) + intake audit
│   ├── 10-DevLog规范.md          the dev-log agent specification (roles / format / rules)
│   └── 11-文档命名规范.md        bilingual naming rules + the full document naming map
├── catalog/                     catalogue layer: the master tool table and statistics
│   └── README.md                all 870 tools + roll-up statistics + validation records
└── tools/                       detail layer: 20 per-category tool tables
    ├── README.md                per-category index
    └── 01-*.md ~ 20-*.md        one table per category (name / slug / priority / feasibility / deps / description)
```

---

## 2. Look it up by goal

| I want to…                                                          | Read                                                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **install it on a server (one command)**                            | [§0, Quick start](#quick-start) in this file                                                                                |
| **learn the site and the CLI**                                      | [`guide/usage.md`](guide/usage.md)                                                                                          |
| **set the port / update source / site address**                     | [`guide/configuration.md`](guide/configuration.md)                                                                          |
| **something is broken**                                             | [`guide/troubleshooting.md`](guide/troubleshooting.md)                                                                      |
| **look up how a `toolboxctl` command works**                        | [`../deploy/binary/README.md`](../deploy/binary/README.md) · or the CLI cheat sheet in the root [`README.md`](../README.md) |
| **contribute code**                                                 | [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                                                                                  |
| **check a term's translation, or how it should be written**         | [`glossary.md`](glossary.md)                                                                                                |
| understand what this project is, quickly                            | [`../README.md`](../README.md) · [`spec/README.md`](spec/README.md)                                                         |
| **set up the environment, run it, write a first tool**              | [`DEVELOPMENT.md`](DEVELOPMENT.md) (English [`DEVELOPMENT.en.md`](DEVELOPMENT.en.md))                                       |
| know how many tools there are                                       | [`catalog/README.md`](catalog/README.md)                                                                                    |
| look up one tool's slug or priority                                 | the matching category under [`tools/`](tools/)                                                                              |
| scaffold the project, create directories                            | [`spec/03-目录结构.md`](spec/03-目录结构.md)                                                                                |
| write a first tool                                                  | [`spec/04-开发规范.md`](spec/04-开发规范.md)                                                                                |
| decide page structure, routes, search, SEO                          | [`spec/06-网页结构与信息架构.md`](spec/06-网页结构与信息架构.md)                                                            |
| sequence the work                                                   | [`spec/07-路线图.md`](spec/07-路线图.md)                                                                                    |
| see what is still undecided                                         | [`spec/08-待决事项.md`](spec/08-待决事项.md)                                                                                |
| start the full execution flow                                       | [`spec/09-执行编排提示词.md`](spec/09-执行编排提示词.md) (read the 3 decision items in its intake audit first)              |
| name a new document / check the naming rules                        | [`spec/11-文档命名规范.md`](spec/11-文档命名规范.md)                                                                        |
| check the dev-log specification                                     | [`spec/10-DevLog规范.md`](spec/10-DevLog规范.md)                                                                            |
| **cut a release, tag it, write a changelog, do a one-line install** | [`RELEASE.md`](RELEASE.md) + the root [`CHANGELOG.md`](../CHANGELOG.md)                                                     |
| **deploy to a server (container / binary)**                         | [`../deploy/binary/README.md`](../deploy/binary/README.md) (binary) · [`../deploy/docker/`](../deploy/docker/) (container)  |
| read the early documentation review                                 | [`审核报告.md`](审核报告.md)                                                                                                |

---

## 3. Canonical numbers (single source of truth)

These are **script-measured** values; the whole documentation set defers to them:

| Dimension              | Value                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Total tools            | **870**                                                                                                 |
| Top-level categories   | **20**                                                                                                  |
| Groups                 | **4** (dev / design / office / life)                                                                    |
| Sub-categories         | **60+** (filters only, no dedicated pages)                                                              |
| Priority distribution  | P0 148 / P1 322 / P2 332 / P3 68                                                                        |
| Feasibility            | A 662 / B 59 / C 79 / D 58 / E 12                                                                       |
| Client-side-only ratio | A+B+C = **92.0%**                                                                                       |
| Total pages            | 870 tool pages + 4 group pages + 20 category pages + 10–20 collection pages + 10 static pages ≈ **924** |

> Statistics methodology and validation records live in [`catalog/README.md`](catalog/README.md).

---

## 4. Documentation conventions

1. **File naming**: kebab-case, ASCII only. The English version is `<name>.en.md` in the same
   directory; README / CONTRIBUTING / CHANGELOG keep their conventional all-caps names.
2. **Terminology**: the single source of truth is [`glossary.md`](glossary.md). Forbidden
   translations listed there are machine-checked — using one in an English document fails the check.
3. **Bilingual pairing**: every reader-facing document exists in both languages, and the two link
   to each other at the top. Changing one side without the other fails `pnpm check:docs`.
4. **Structural alignment**: a pair must have the same number of sections and code blocks. Relative
   links must resolve and `path#anchor` targets must exist.
5. **Numbers**: "target" means a design goal, "measured" means a script result; on conflict,
   **measured** wins.
6. **Status markers**: `✅` verified / `⚠️` needs confirmation / `🔄` changed this round.

---

## 5. Change log

### Round 1 (three-layer reorganisation)

Three things were done: **relocate, repair, fill in**.

- **Relocate**: the 29 flat documents under `docs/toolbox-spec/` were regrouped into the three
  layers "specification / catalogue / detail", becoming `spec/`, `catalog/` and `tools/`.
- **Repair**: fixed 4 leftover bare slugs, 3 inconsistent figures and 1 heading that contradicted
  its content.
- **Fill in**: added this file, `spec/08-待决事项.md` and `tools/README.md` (29 → 32 documents).

### Round 2 (execution prompt taken in, 2026-09-23)

- **Intake**: the execution orchestration prompt (`spec/09`) and the dev-log spec (`spec/10`) were
  recorded verbatim (32 → 34 documents).
- **Audit**: the prompt versus the existing documents — **2 blocking issues** (4 groups ↔ 20
  categories: 240 tools across 8 categories had no group; batch sizes still used the old estimates
  640/90/80/45/15 ≠ the measured 662/59/79/58/12) plus 12 figure discrepancies, detailed in the
  intake audit at the end of [`spec/09`](spec/09-执行编排提示词.md).
- **Decisions recorded**: item #1 framework = **Vite**, #3 granularity = **870 independent routes**
  (both effectively settled by the prompt), logged in [`spec/08`](spec/08-待决事项.md).
- **Logging infrastructure**: `.agent/logs/{devlog.md, events.jsonl}` created, first entry
  `[DOC/B-1]` written.

### Round 3 (bilingual developer handbook, 2026-09-23)

- **Added**: `DEVELOPMENT.md` / `DEVELOPMENT.en.md` (34 → 36 documents) — the hands-on handbook for
  developers: environment, catalog mechanics, the 20-category ↔ 4-group source of truth, the
  metadata contract, T1–T6 selection, the 6-step tool workflow, gates, red lines, troubleshooting.
- **Canonical figures**: §5 of the handbook gives the **single** 20-category ↔ 4-group table
  (dev 360 / design 200 / office 60 / life 250 = 870), superseding the conflicting description in
  §6 of the execution prompt (resolving open decision #2).
- **Decisions recorded**: three more settled — execution host = **native Windows** (no WSL2
  migration), batch sizes switched to the measured **662/59/79/58/12**, 4-group mapping adopted
  from the canonical table.
- **Conflicts logged**: §15 of the handbook lists 6 internal inconsistencies in `spec/` (dead path
  in the review report, outdated file list in `spec/03` §3, obsolete multi-tab suggestion in
  `spec/02` §7, roadmap prerequisite table out of sync, duplicated Mock API count in `spec/05`,
  stale batch sizes in `spec/09`). The handbook's figures win until `spec/` is revised.
- Open decisions narrowed to 4 (A i18n / B 21→20 / C WASM delivery / D category-D notice styling).

### Round 4 (document naming rules, 2026-09-23)

- **Added**: `spec/11-文档命名规范.md` (36 → 37 documents) — 8 bilingual naming rules, 5
  Chinese–English correspondence principles, 12 example groups by document type, and a full naming
  map for the project's 38 documents.
- **Recommendation**: **English file names, Chinese display names** — ASCII file names avoid the
  escaping cost of Chinese paths in git and scripts, while Chinese names serve the H1 and index
  tables. A fallback "all-Chinese file names" option is documented alongside it.
- **Pending migration**: adopting English file names means updating about 40 cross-references
  across 36 documents; the list is in `spec/11` §5.

### Round 5 (installation entry layer, 2026-09-24)

**Context**: the documentation set was missing its **entry layer** — the one-line install command
existed only deep inside `RELEASE.md` §4 and `deploy/binary/README.md` §3.1, the repository root had
**no `README.md` at all**, and the single install link in `RELEASE.md`
(`raw.githubusercontent.com/.../install.sh`) returned **404** because the repository is private.

- **Added**: root `README.md` (Chinese landing page) and `README.en.md` (English), with positioning,
  the three deployment paths, a `toolboxctl` cheat sheet, target-machine requirements, project
  layout and a documentation index.
- **Added**: [§0, Quick start](#quick-start) in this file — runnable install / container / local-dev
  commands — plus two entry rows at the top of the lookup table.
- **Fixed**: the install link in `RELEASE.md` §4 now points at the **tag-bound release asset**, with
  the three workarounds for a private repository spelled out; the comment header in `install.sh`
  was updated to match.
- **Completed**: `DEVELOPMENT.md` / `DEVELOPMENT.en.md` never mentioned the `deploy/binary/` path at
  all; §20 "Deployment and release (three paths)" was added to both.
- **Added**: a "shortest path" card at the top of `deploy/binary/README.md` (its install section was
  at line 74 of a 228-line document).

### Round 6 (big-tech-style refactor: engineering config + bilingual docs, 2026-09-24)

**Context**: the repository had documentation but no **engineering constraints** — formatting,
documentation and bilingual coverage all relied on discipline. This round turns all three into
executable checks.

- **Engineering config**: added `.editorconfig`, `.prettierrc.json`, `.prettierignore`,
  `.gitattributes` (LF everywhere) and `eslint.config.js` (flat config, one file for the whole
  repository). Root scripts gained `lint` / `lint:fix` / `format` / `format:check` / `check:docs` /
  `verify`; the unused `lint` task was removed from `turbo.json` (one config scans everything, so
  fanning out per package buys nothing).
- **Bilingual documentation set**: added `docs/guide/` (index + getting started + usage +
  configuration + troubleshooting, all four paired), `docs/glossary.md` (terminology source of
  truth), root `CONTRIBUTING.md`, and this file's English edition `README.en.md`.
- **Consistency checking**: added `scripts/check-docs.ts` (9 checks — see §4 above and `glossary.md`
  §5), wired into `pnpm check:docs` and CI. Bilingual docs went from "hope someone remembers" to
  "miss one side and the check fails".
- **Live-demo addresses recorded**: `https://006336.xyz/` and `https://www.006336.xyz/`, marked
  **not launched yet** in the root README and `guide/getting-started.md`; the `SITE_ORIGIN` default
  changed from the placeholder `https://example.com` to the production domain.
- **Three real defects fixed along the way**: CI watched `main` while the actual branch is `master`
  (so CI had never run on push), `loadTool` created a fresh `lazy()` wrapper on every render
  (switching language remounted the tool and discarded user input), and the search overlay backdrop
  was a `<div onClick>` (unreachable by keyboard — the a11y rule was reporting a genuine defect, not
  a false positive).
