# Contributing

> [中文](CONTRIBUTING.md) | **English**
> This document covers **how to change the project**: environment, conventions, workflow and gates.
> For what the project is and how to deploy it, see [`README.md`](README.md) and
> [`docs/guide/`](docs/guide/README.md).

---

## 1. Read these three first

| Document                                                     | Why first                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)                 | the developer handbook: catalog mechanics, metadata contract, template choice, the eight red lines |
| [`docs/guide/configuration.md`](docs/guide/configuration.md) | configuration has three layers; editing the wrong one looks like "nothing happened"                |
| [`docs/glossary.md`](docs/glossary.md)                       | the terminology source of truth; it decides which word you use in English                          |

---

## 2. Local environment

### 2.1 Requirements

Node ≥ 22.22 and pnpm ≥ 9. No Docker, no Go, no WSL. Browser automation can drive the Edge that is
already installed, so there is no Chromium download.

### 2.2 First-time setup

```bash
git clone https://github.com/zhang123999-qq/toolbox.git
cd toolbox
pnpm install --ignore-scripts   # esbuild's postinstall hits EBUSY on some Windows setups
pnpm verify                     # run the gates once to confirm the baseline is green
pnpm dev                        # development server
```

---

## 3. Layout and naming conventions

### 3.1 Directory structure

| Directory                        | Responsibility                                                            | Keep out                    |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| `packages/catalog`               | the 20-category ↔ 4-group source of truth, Zod contract, route derivation | any UI                      |
| `packages/search`                | the search facade (Orama adapter slot)                                    | helpers unrelated to search |
| `apps/web/src/tools/<slug>/`     | the 8 files of one tool                                                   | logic shared across tools   |
| `apps/web/src/components/`       | layout, tool shell, templates, shared pieces                              | business logic              |
| `apps/web/src/{i18n,theme,lib}/` | copy, theme, cross-cutting helpers                                        | any hardcoded copy          |
| `scripts/`                       | build-time scripts (generate / validate / pre-render)                     | runtime code                |
| `deploy/`                        | the container and binary deployment paths                                 | front-end source            |

### 3.2 Naming conventions

| Thing                 | Convention                                                                        | Example                                                              |
| --------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| tool slug             | lowercase, hyphenated, meaningful, and **not colliding with an npm package name** | `json-formatter` (not `jsonFormatter`, `json_formatter` or `base64`) |
| React component files | PascalCase                                                                        | `ToolShell.tsx`                                                      |
| non-component modules | kebab-case or camelCase, consistently within a group                              | `catalog-text.ts`, `useDocumentTitle.ts`                             |
| documentation files   | kebab-case, ASCII only; the English version adds `.en.md`                         | `getting-started.md` / `getting-started.en.md`                       |
| test files            | `test.ts` / `Tool.test.tsx` inside the tool directory                             | `src/tools/<slug>/test.ts`                                           |

---

## 4. Code conventions

### 4.1 Formatting and linting

```bash
pnpm format        # Prettier, writes
pnpm format:check  # check only (what CI runs)
pnpm lint          # ESLint (flat config, one file for the whole repo)
pnpm lint:fix      # fix what can be fixed automatically
```

Formatting is decided by Prettier alone — do not debate indentation or quotes in review, just run
`pnpm format`. ESLint only enforces correctness and accessibility and carries no formatting rules,
so the two tools never fight each other.

### 4.2 Hard conventions

Start with the **eight red lines** in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) §10.4; five of
them come up most often in day-to-day work:

| Convention                       | Why                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| never hand-write the route table | routes are derived from catalog; a hand-written table drifts from the source of truth |
| never skip input validation      | all external input goes through Zod, and errors must point at a position              |
| never upload user data           | local-first is the whole point; no "just reporting a bit" exception                   |
| tools never import each other    | lift shared logic into `features/` or `lib/`, or coupling grows exponentially         |
| never hardcode copy              | go through i18n keys; a missing key makes the English bundle fail to compile          |
| keep `utils.ts` pure             | no React, no DOM, no side effects — otherwise it cannot be unit tested                |

---

## 5. Workflow

### 5.1 Adding a tool

```bash
mkdir -p apps/web/src/tools/<slug>
# create the 8 files: meta / schema / utils / Tool.tsx / test / Tool.test.tsx / e2e.spec.ts / README.md
pnpm generate:catalog   # rebuild the registry (mandatory after editing meta.ts, or English titles never appear)
pnpm check:tools        # validate the metadata contract
pnpm verify             # full gate set
pnpm dev                # open /tools/<slug> and take a look
```

Pick one of T1–T6; do not invent a layout. Category D / E tools **must state their data flow on the
page** — that is a red line, not a suggestion.

### 5.2 Fixing a bug

Write a **failing test first**, then change code until it passes. Most defects in this project only
show up on a real machine (asynchronous reload, duplicate dependency instances, chunk ownership), so
add an assertion that reproduces it — otherwise the same bug comes back.

---

## 6. Commit messages

Conventional Commits. Keep the subject under 72 characters and use the body to explain **why**, not
what:

```text
<type>(<scope>): <subject>

<body: motivation, trade-offs, blast radius>

<footer: related issue>
```

| type       | Use for                                |
| ---------- | -------------------------------------- |
| `feat`     | a new capability                       |
| `fix`      | a defect fix                           |
| `docs`     | documentation only                     |
| `refactor` | restructuring with no behaviour change |
| `test`     | tests only                             |
| `chore`    | build, dependencies, configuration     |
| `ci`       | pipelines                              |

**One commit, one thing.** Fixing a bug plus refactoring, or adding a feature plus reformatting,
makes it impossible to judge risk quickly in review.

---

## 7. Gates that must pass before you commit

```bash
pnpm verify
```

It runs, in order: metadata validation → documentation consistency → ESLint → Prettier check →
type check → unit tests. Do not commit if any of them fails. CI runs the same commands, so passing
locally means passing remotely.

| Gate           | Catches                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `check:tools`  | missing metadata fields, non-contiguous numbering, category totals not adding up to 870              |
| `check:docs`   | a missing half of a pair, misaligned structure, broken links, dead anchors, inconsistent terminology |
| `lint`         | unused variables, accessibility defects, hook rule violations                                        |
| `format:check` | formatting drift                                                                                     |
| `typecheck`    | type errors across the three packages                                                                |
| `test`         | behavioural regressions                                                                              |

---

## 8. Pull request conventions

1. **Small steps**: one PR solves one problem; split sweeping changes into several PRs.
2. **State how you verified it**: include the gate output, screenshots for UI changes, and real
   target-machine results for deployment changes.
3. **Do not touch unrelated files**: repo-wide formatting or import reordering belongs in its own PR.
4. **Keep documentation in sync**: change behaviour, change the docs; both languages, and
   `pnpm check:docs` enforces it.
5. **Do not commit artifacts**: `dist/`, `dist-release/`, `tmp-shots/` and `verify.mjs` are already
   in `.gitignore`.

---

## 9. Contributing documentation

| Rule                   | Requirement                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Paired languages       | `<name>.md` and `<name>.en.md` in the same directory; the switcher links at the top must work in both directions |
| Aligned structure      | matching section counts and code-block counts (checked by script)                                                |
| Consistent terminology | follow [`docs/glossary.md`](docs/glossary.md); forbidden translations are machine-checked                        |
| Indexed on arrival     | a new document must appear in the map in [`docs/README.md`](docs/README.md)                                      |
| Explicit anchors       | prefer `<a id="x"></a>` for cross-section links instead of relying on slugs derived from Chinese headings        |
| Runnable commands      | every command in the docs must actually run; give the expected result rather than "it should work"               |

After editing, run:

```bash
pnpm check:docs
```
