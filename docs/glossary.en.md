# Glossary

> [中文](glossary.md) | **English**
> This file is the **single source of truth for terminology**: Chinese–English pairs plus an
> explicit list of _forbidden translations_. The forbidden column is not advice — it is enforced
> by `pnpm check:docs`, so using one of those terms in an English document fails the build.

---

## 1. Why this glossary exists

The real risk in bilingual documentation is not a missing translation; it is **the two sides
drifting apart after the fact**:

| How it drifts                                                                | What it costs                                                              |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| One concept gets two English names (域 becomes both _category_ and _domain_) | Readers assume they are different things, and search misses half the pages |
| A section is added on one side only                                          | English readers get stale information, and nobody notices                  |
| A heading is renamed and every inbound anchor breaks                         | Links silently jump to the top of the page                                 |

None of that is prevented by "being careful". It is prevented by **turning terminology into
machine-readable data and structure into assertable constraints**. Column 3 below is for readers;
column 4 is what the checker reads.

---

## 2. Product and architecture terms

| Chinese    | English             | Notes                                                                                | Forbidden                                     |
| ---------- | ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- |
| 工具库     | Toolbox             | the product name (singular, capitalised); also the repository name                   | Tool Library, Toolkit                         |
| 工具       | tool                | one self-contained client-side utility                                               | utility, widget                               |
| 工具页     | tool page           | the route for a single tool, `/tools/<slug>`                                         | toolpage, tool-page                           |
| 域         | category            | a top-level category, 20 of them, keyed by the `category` slug                       | domain category, domain taxonomy              |
| 大组       | group               | one of the four mental-model groups: dev / design / office / life                    | major group, big group                        |
| 子类       | sub-category        | one of 60+ second-level groupings, used only as a filter, never a page               | subcategory, sub category                     |
| 纯前端     | client-side         | all logic runs in the browser; there is no server-side computation                   | pure front-end, pure frontend, front-end only |
| 本地优先   | local-first         | data never leaves the device                                                         | local first, local priority                   |
| 数据不上传 | nothing is uploaded | the precise privacy claim                                                            | no data upload, data is not uploaded          |
| 免登录     | no sign-in          | no account required                                                                  | no login, login-free                          |
| 明暗主题   | light/dark theme    | there are _two_ themes and a toggle; naming only the dark one loses half the feature | dark mode                                     |
| 预渲染     | pre-rendering       | emitting static HTML at build time (SSG)                                             | prerenderization                              |
| 真源       | source of truth     | the single authoritative source                                                      | truth source                                  |
| 元数据     | metadata            | the per-tool `meta.ts` fields                                                        | meta data, meta-data                          |

---

## 3. Engineering and process terms

| Chinese         | English                  | Notes                                                                               | Forbidden                               |
| --------------- | ------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------- |
| 一条命令安装    | one-line install         | a single `curl` downloads and installs; the point is _one command_, not _one click_ | one-click install, one click install    |
| 二进制部署      | binary deployment        | ship a pre-built artifact; the target needs no source and no toolchain              | compiled deployment                     |
| 部署包          | bundle                   | the self-contained tar.gz artifact                                                  | package archive                         |
| 在线升级        | online upgrade           | fetch a new version from a release source and switch to it                          | live upgrade, OTA upgrade               |
| 回滚            | rollback                 | switch back to the previous working version                                         | revert to                               |
| 独立 nginx 实例 | dedicated nginx instance | ships its own pid, logs and temp paths; never reads `/etc/nginx`                    | separate nginx instance, isolated nginx |
| 发布源          | release source           | a directory or HTTP base serving `latest.txt` and the packages                      | publish source, distribution point      |
| 门禁            | gate                     | the checks that must pass before a commit lands                                     | quality barrier                         |
| 铺量            | scale out                | bulk-generate the remaining tools after a small batch validates the pipeline        | pave, spread                            |
| 首帧闪动        | first-paint flash        | the flicker caused by pre-rendered content disagreeing with stored preferences      | FOUC, flicker                           |
| 骨架            | skeleton                 | the stage-0 foundation                                                              | framework skeleton                      |
| 自检            | doctor                   | `toolboxctl doctor`: checks dependencies, ports, disk and privileges                | self-test, selfcheck                    |

---

## 4. Writing conventions

| Convention        | Requirement                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File names        | kebab-case, ASCII only (`getting-started.md`); the Chinese title lives in the H1 and the index tables, keeping paths free of characters that git and scripts would escape |
| English suffix    | `<name>.en.md`, in the same directory as the Chinese file; no `en/` subtree, which would let two directory trees drift apart                                              |
| Language switcher | first line of every document: `> **中文** \| [English](x.en.md)`, pointing at each other                                                                                  |
| Section numbering | Chinese uses 一、二、三; English uses 1. 2. 3. — but **the number of sections must match**                                                                                |
| Code block count  | paired documents must contain the same number of fenced blocks (a machine-checkable proxy for structural alignment)                                                       |
| Relative links    | always relative; `../` across directories, never a repository-absolute path                                                                                               |
| Numbers           | "measured" means produced by a script, "target" means a design goal; on conflict, measured wins                                                                           |

---

## 5. How this is enforced

```bash
pnpm check:docs            # exit code 1 on any error
pnpm check:docs --strict   # treat warnings as failures too
```

`scripts/check-docs.ts` runs nine checks: bilingual pairing, bidirectional language-switcher
links, matching section and code-block structure, resolvable relative links, real `path#anchor`
targets, absence of forbidden translations, presence of the online URLs together with the
"not launched yet" marker, whether new documents appear in the `docs/README.md` map, and
kebab-case file naming.

For the first eight, anything wrong in a Tier A document (reader-facing) is an **error**, while
the same problem in a Tier B document (internal engineering docs) is downgraded to a **warning**
and counted — so the bilingual rollout can proceed in batches instead of blocking on a full
translation.
