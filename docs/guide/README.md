# 使用指南

> **中文** | [English](README.en.md)
> 面向**使用与运维**的四篇文档。想了解项目是什么、为什么这么设计，请看
> [`../spec/README.md`](../spec/README.md)；想改代码，请看 [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)。

---

## 一、四篇指南

| 文档                                       | 回答什么问题                   | 适合什么时候读               |
| ------------------------------------------ | ------------------------------ | ---------------------------- |
| [`getting-started.md`](getting-started.md) | 怎么把它跑起来                 | 第一次接触，机器还没装       |
| [`usage.md`](usage.md)                     | 怎么用站点与命令行             | 装好了，想知道能干什么       |
| [`configuration.md`](configuration.md)     | 端口 / 升级源 / 站点地址怎么改 | 要改默认值，或部署到正式域名 |
| [`troubleshooting.md`](troubleshooting.md) | 装不上、起不来、升级失败怎么办 | 出问题的时候                 |

---

## 二、按目的查阅

| 我想…                            | 看                                             |
| -------------------------------- | ---------------------------------------------- |
| 在一台 Linux 服务器上装起来      | [`getting-started.md`](getting-started.md) §二 |
| 用 Docker 跑起来                 | [`getting-started.md`](getting-started.md) §三 |
| 学会用站点（搜索 / 语言 / 主题） | [`usage.md`](usage.md) §一                     |
| 用命令行做升级与回滚             | [`usage.md`](usage.md) §二                     |
| 在脚本里读工具清单               | [`usage.md`](usage.md) §三                     |
| 换端口、指到内网升级源           | [`configuration.md`](configuration.md) §三     |
| 部署到正式域名                   | [`configuration.md`](configuration.md) §二     |
| 搞清某个术语的中英对照           | [`../glossary.md`](../glossary.md)             |

---

## 三、阅读顺序建议

**部署者**：`getting-started` → `configuration` → 需要时查 `troubleshooting`。
**日常运维**：`usage` §二 → `configuration` §三 → `troubleshooting` §四。
**偶然访问站点的人**：`usage` §一 即可，其余不必读。

---

## 四、这些文档怎么维护

四篇指南都是**中英成对**的：中文 `<name>.md` 与英文 `<name>.en.md` 同目录，
顶部互相链接。结构一致性由脚本校验——章节数、代码块数量必须两边一致，
术语必须与 [`../glossary.md`](../glossary.md) 对齐：

```bash
pnpm check:docs            # 出错即失败
pnpm check:docs --strict   # 连警告也视为失败
```

所以改文档时请**两边一起改**：只改中文会让校验失败，这是刻意的设计。
