# Source Organization Standard

> **English** | [中文](source-organization.md)
> This document defines **where source lives, how it is named and what it may depend on**. It is a
> **mandatory constraint**: if the machine check fails, CI fails and the change cannot be merged.
> The core rule in one sentence: **one tool = one dedicated folder, self-contained, with no
> cross-tool dependencies.**
> Enforced by `pnpm check:source-org` ([`scripts/check-source-org.ts`](../scripts/check-source-org.ts)).

---

## 1. One tool, one folder

- Every tool must map to exactly one dedicated folder, at the fixed path
  `apps/web/src/tools/<tool-id>/`.
- The folder is self-contained: it may hold these 8 files and nothing else.

  ```text
  apps/web/src/tools/<tool-id>/
  ├── meta.ts          tool metadata (source of truth; re-run generate:catalog after edits)
  ├── schema.ts        Zod contract for input and options
  ├── utils.ts         pure functions (no React, no DOM)
  ├── Tool.tsx         the single component entry; must use a T1-T6 template
  ├── test.ts          unit tests for utils
  ├── Tool.test.tsx    component tests
  ├── e2e.spec.ts      Playwright spec
  └── README.md        tool notes (options / data flow / limits / examples)
  ```

- Folders are strictly isolated: **importing across tool folders is forbidden** (a relative path
  containing `../<other-tool>/` is a violation).
- Never define shared logic inside a tool folder for the benefit of another tool. Logic that is
  genuinely reusable belongs in `apps/web/src/lib/` or `packages/`.
- Never pack several tools into one folder (more than one `*Tool.tsx` in a folder counts as mixing).

---

## 2. Naming

| Object          | Constraint                                                                                          | Correct                | Wrong                      |
| --------------- | --------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| Folder name     | kebab-case, globally unique, **identical to the catalog tool id**                                   | `json-formatter/`      | `jsonFormatter/`, `tool1/` |
| Inner file name | fixed set of 8: `meta` / `schema` / `utils` / `Tool` / `test` / `Tool.test` / `e2e.spec` / `README` | `utils.ts`             | `helper.ts`, `common.ts`   |
| `meta.ts`       | `id` and `slug` must equal the folder name                                                          | `id: 'json-formatter'` | `id: 'jsonFormatter'`      |

- The folder name maps one-to-one to the tool's purpose: unambiguous and descriptive.
- Names like `tool1/`, `utils/`, `helpers/` and `misc/` are banned — they break search and review
  at the same time.

---

## 3. Dependency scope

| Class      | Scope                                                                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed    | The standard library and third-party libraries (they must pass `pnpm check:licenses`); shared infrastructure: `packages/catalog`, `packages/search`, `packages/config`, `apps/web/src/lib`, `apps/web/src/components/tool/templates`, `apps/web/src/{i18n,theme}` |
| Allowed    | Shared packages opened up as the project grows: `packages/ui`, `packages/tools-core`, `packages/wasm`, `packages/pwa`, `services`, `hooks` (not landed yet; allowed once they exist)                                                                              |
| **Banned** | Importing across tool folders                                                                                                                                                                                                                                     |
| **Banned** | Moving a tool's own logic into another tool's folder. Lifting it to a shared package is fine only when it is genuinely reusable, and the shared layer must never import the tool back                                                                             |

A shared layer importing a specific tool is business logic leaking in the wrong direction; the check
flags it (`apps/web/src/{lib,components,i18n,theme}` and `packages/` must not import
`tools/<some-tool>`).

---

## 4. Compliance check

### 4.1 Command and CI

```bash
pnpm check:source-org                  # check only; exit code 1 on violation
pnpm check:source-org --report         # also write the audit report
```

Run it before adding or modifying any tool. CI treats it as a **required gate**: failure blocks the
merge. `pnpm verify` already includes it. The violation list is printed as
`{ tool, files, violations, suggestions }`, so the suggestions can be applied directly.

### 4.2 The six machine-checked rules

| #   | Rule                         | How it is decided                                                                                      |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Folder ↔ catalog mapping     | The folder name must be a tool id in the catalog, and the mapping must hold in both directions         |
| 2   | Standard file set            | **Any missing file is a violation**; extra files are a violation too                                   |
| 3   | Cross-tool import            | A relative import path matching `../<other-tool>/`                                                     |
| 4   | Multiple tools in one folder | More than one `*Tool.tsx` in the same folder                                                           |
| 5   | Naming                       | Not kebab-case, or inconsistent with the catalog id, or with `id` / `slug` in `meta.ts`, or duplicated |
| 6   | Shared layer importing back  | A shared layer imports `tools/<some-tool>` (logic pushed out of place)                                 |

### 4.3 Audit report

The full audit writes `.agent/reports/source-org-audit.md`, grouped by violation type:

- several tools mixed into one folder
- missing or extra files in a folder
- imports across tool folders
- naming conflicts or non-compliant names
- business logic pushed out of place

---

## 5. Cleaning up existing code

### 5.1 Procedure

Existing code is cleaned up as well, whether or not the tool is finished: anything violating this
standard is refactored into "one tool, one folder". After each tool, run immediately:

```bash
pnpm check:source-org
pnpm test <tool-id>
pnpm playwright test <tool-id>
```

When everything is done, re-run the full set: `pnpm check:source-org` → `pnpm verify` →
`pnpm build:ssg`.

### 5.2 No regressions

| Requirement       | How it is decided                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| No behaviour loss | Unit and E2E counts must **only grow**, and everything must stay green                                  |
| No coverage drop  | Coverage after the refactor must not fall below the baseline; if unavailable, count cases and record it |
| Traceability      | The list, progress and blocked items go into `.agent/reports/source-org-refactor.md`                    |
| Forbidden         | Deleting tests, lowering coverage, pushing shared logic back into tool folders, skipping CI             |

---
