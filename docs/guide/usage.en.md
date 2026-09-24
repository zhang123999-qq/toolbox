# Usage Examples

> [中文](usage.md) | **English**
> Everything here is meant to be **copied and run**: first the browser, then the command line,
> then programmatic use. Each example states the expected result, so you can tell whether it
> actually worked.

---

## 1. Using the site (in the browser)

### 1.1 Home page and navigation

The home page is the landing page. Top to bottom: hero with two primary calls to action, core
highlights, the four groups, a 20-category overview, shipped tools, and a closing call to action.
The top bar holds the site name, the four groups, all tools, search, the theme switch and the
language switch.

| I want to          | Do this                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| Browse by group    | In the top bar, pick `Development / Design & Media / Office & Docs / Life & Learning` |
| Browse by category | Click any tile in "20 categories", or open `/c/<group>/<category>`                    |
| See all 870 tools  | "All tools" in the top bar, or `/tools`                                               |
| Start over         | Click the site name in the top-left corner                                            |

### 1.2 Global search

Press `Ctrl + K` (`⌘ + K` on macOS), type a keyword, move with the arrow keys, press Enter to
open, `Esc` to close. Search matches tool titles, tags and descriptions. The index is built from
the Chinese metadata at build time and **localised at render time**, so Chinese keywords still
match while the interface is in English.

| Key          | Effect                      |
| ------------ | --------------------------- |
| `Ctrl/⌘ + K` | open or close search        |
| `↑` `↓`      | move the highlighted result |
| `Enter`      | open the highlighted result |
| `Esc`        | close                       |

### 1.3 Language and theme

The `中 \| EN` control on the right of the top bar switches language; the moon/sun icon next to it
switches the theme. Both are written to `localStorage` (`toolbox.locale` / `toolbox.theme`), so
**a reload or a later visit remembers them**. The theme is applied by an inline script before the
first paint, so there is no light-then-dark flash. If the remembered language is English, the page
first covers the pre-rendered Chinese, then reveals it once the provider is ready — avoiding a
Chinese-then-English flash.

### 1.4 A tool page, using JSON Formatter as the example

Open `/tools/json-formatter`. Input on the left, output on the right, results as you type.

Paste this:

```json
{ "b": 1, "a": [3, 2, 1], "note": "try indent and key sorting" }
```

Expected result: the output pane shows the indented JSON; ticking "sort keys" moves `a` before
`b`; "minify" collapses the output to one line; invalid input shows the error position in the
output pane instead of failing silently. Every tool page offers the same four actions — copy,
download, clear, sample — plus a feasibility note in the page footer.

---

## 2. Using the command line

### 2.1 Everyday operations

```bash
toolboxctl status          # service / version / port / health at a glance
toolboxctl list            # installed versions, * marks the active one
toolboxctl logs -f         # follow the journal and the nginx logs
toolboxctl backup          # back up configuration and state
toolboxctl doctor          # environment self-check (deps / ports / disk / privileges)
```

One line of `status` deserves special attention: **versions agree**. It compares the version
written in the config, the version the `current` symlink points at, and the version `/healthz`
reports. If those disagree, an upgrade or rollback was interrupted.

### 2.2 Online upgrade

```bash
toolboxctl check-update --source <release-source>   # see whether a newer version exists
toolboxctl upgrade --source <release-source>        # upgrade
```

The sequence is: resolve the version → download the bundle and its `.sha256` → verify the archive
→ verify every file → unpack into a new directory → atomically re-point the `current` symlink →
render and validate the nginx config → reload → **poll `/healthz` until it reports the new
version**. If any step fails it switches straight back to the previous version rather than
stopping halfway.

### 2.3 Rollback

```bash
toolboxctl rollback              # go back to the previous version
toolboxctl rollback --to 0.0.1   # go back to a specific version
```

A rollback is the same three steps — re-point the symlink, reload, health check — and prints a
confirmation. If the health check still fails afterwards it says so plainly instead of pretending
to have succeeded.

### 2.4 Backup and uninstall

```bash
toolboxctl backup --output /root/tb-backup   # back up config and state to a directory
toolboxctl uninstall                         # remove the site, keep the nginx dependency
toolboxctl uninstall --purge --purge-deps     # also remove config, state and the nginx dependency
```

Not removing dependencies by default is deliberate: another site on this machine may be sharing
that nginx.

---

## 3. Using the catalog as a library

`@toolbox/catalog` is pure data with no DOM dependency, so it can be imported from build scripts,
CI or plain Node:

```ts
import { CATEGORIES, GROUPS, TOOLS, getTool, groupOfCategory } from '@toolbox/catalog'

const tool = getTool('json-formatter')
console.log(tool?.title, tool && groupOfCategory(tool.category))
console.log({ tools: TOOLS.length, categories: CATEGORIES.length, groups: GROUPS.length })
// expected: JSON 格式化 dev / { tools: 1, categories: 20, groups: 4 }
```

It is the site-wide source of truth: the route table, the search index and the sitemap are all
derived from it, so "the number of categories in the docs" and "the number the code runs with"
cannot disagree — if they do, `pnpm check:tools` fails first.

---

## 4. Complete command sequences for common tasks

First launch on a clean server:

```bash
curl -fsSL <release-source>/install.sh | sudo bash -s -- --source <release-source> --dry-run   # preview
curl -fsSL <release-source>/install.sh | sudo bash -s -- --source <release-source>             # install
toolboxctl status                                                                             # versions agree
curl -s http://127.0.0.1/healthz                                                              # ok v<version>
```

Routine releases, and bailing out when something is wrong:

```bash
toolboxctl check-update --source <release-source>
toolboxctl upgrade --source <release-source>
toolboxctl health || toolboxctl rollback    # roll back if the health check fails
```
