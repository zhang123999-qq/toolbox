# Guide

> [中文](README.md) | **English**
> Four documents aimed at **using and operating** Toolbox. To learn what the project is and why it
> is designed this way, see [`../spec/README.md`](../spec/README.md); to change code, see
> [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## 1. The four guides

| Document                                   | Question it answers                                      | When to read it                                          |
| ------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| [`getting-started.md`](getting-started.md) | How do I get it running?                                 | first contact, nothing installed yet                     |
| [`usage.md`](usage.md)                     | How do I use the site and the CLI?                       | installed, wondering what it can do                      |
| [`configuration.md`](configuration.md)     | How do I change the port, update source or site address? | changing defaults, or deploying to the production domain |
| [`troubleshooting.md`](troubleshooting.md) | It will not install, start or upgrade — now what?        | when something is broken                                 |

---

## 2. Look it up by goal

| I want to…                                            | Read                                          |
| ----------------------------------------------------- | --------------------------------------------- |
| install on a Linux server                             | [`getting-started.md`](getting-started.md) §2 |
| run it with Docker                                    | [`getting-started.md`](getting-started.md) §3 |
| learn the site (search / language / theme)            | [`usage.md`](usage.md) §1                     |
| upgrade and roll back from the CLI                    | [`usage.md`](usage.md) §2                     |
| read the tool list from a script                      | [`usage.md`](usage.md) §3                     |
| change the port or point at an internal update source | [`configuration.md`](configuration.md) §3     |
| deploy to the production domain                       | [`configuration.md`](configuration.md) §2     |
| check how a term is translated                        | [`../glossary.md`](../glossary.md)            |

---

## 3. Suggested reading order

**Deploying**: `getting-started` → `configuration` → consult `troubleshooting` as needed.
**Day-to-day operations**: `usage` §2 → `configuration` §3 → `troubleshooting` §4.
**Just visiting the site**: `usage` §1 is enough; skip the rest.

---

## 4. How these documents are maintained

All four guides are **paired**: the Chinese `<name>.md` and the English `<name>.en.md` sit in the
same directory and link to each other at the top. Structural alignment is verified by a script —
the number of sections and code blocks must match on both sides, and terminology must agree with
[`../glossary.md`](../glossary.md):

```bash
pnpm check:docs            # fails on any error
pnpm check:docs --strict   # treat warnings as failures too
```

So when you edit documentation, **edit both sides together**: changing only the Chinese side fails
the check, and that is intentional.
