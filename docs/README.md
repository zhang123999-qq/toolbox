# 静态工具站 · 文档中心

> 状态：**阶段 0 已完成**（骨架 + 示例工具 + 双语/主题 + 容器与二进制两条部署链路）
> 更新时间：2026-09-24
> 工具总量：**870 个 / 20 域 / 4 大组**（已实现 1 个）

> **中文** | [English](README.en.md)

---

<a id="quick-start"></a>

## 零、快速开始

一条命令装到 Linux 服务器（目标机只需 `bash` + `tar` + `systemd` + `nginx`，
不需要 Node / pnpm / Docker）：

```bash
curl -fsSL <发布源>/install.sh | sudo bash -s -- --source <发布源>
```

细节不在这里展开——四篇使用指南各管一段，按需要点开：

| 我要…                                    | 看                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 三种方式任选一种把站点跑起来             | [`guide/getting-started.md`](guide/getting-started.md)                                                   |
| 学会用站点（搜索 / 语言 / 主题）与命令行 | [`guide/usage.md`](guide/usage.md)                                                                       |
| 改端口、升级源、部署到正式域名           | [`guide/configuration.md`](guide/configuration.md)                                                       |
| 装不上、起不来、升级失败                 | [`guide/troubleshooting.md`](guide/troubleshooting.md)                                                   |
| 逐个参数查一键安装（版本 / 代理 / 自启） | [`deploy/one-line-install.md`](deploy/one-line-install.md)                                               |
| 查 `toolboxctl` 全部命令                 | [`../deploy/binary/README.md`](../deploy/binary/README.md) · 根 [`README.md`](../README.md) 的命令行速查 |
| 参与开发                                 | [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                                                               |

> ⚠️ 仓库当前为 **private**：`raw.githubusercontent.com` 与 Release 资产对匿名请求均返回 **404**（已实测）。
> 要拿 GitHub 当发布源：① 转 public；② 安装时带 `GITHUB_TOKEN`；③ 用自建 / 内网发布源（生产推荐）。

---

## 一、文档地图

```text
<仓库根>
├── README.md                    ← 项目落地页：定位 / 快速开始 / CLI 速查（英文 README.en.md）
├── CONTRIBUTING.md              ← 贡献指南：环境 / 约定 / 流程 / 门禁（英文 CONTRIBUTING.en.md）
├── CHANGELOG.md                 ← 变更日志
└── docs/                        ← 以下为文档目录
├── README.md                    ← 本文 · 文档总索引
├── glossary.md                  ← 术语表：中英对照 + 禁用译法（校验脚本的真源）
├── guide/                       使用指南（面向使用与运维，四篇）
│   ├── README.md                指南索引
│   ├── getting-started.md       安装与快速上手（三条部署链路）
│   ├── usage.md                 使用示例（站点 / 命令行 / 当库用）
│   ├── configuration.md         配置说明（构建期 / 运行期 / 浏览器端）
│   └── troubleshooting.md       排障（症状 → 原因 → 处理）
├── deploy/                      部署层：一键安装脚本与说明
│   ├── one-line-install.md      一键安装：参数 / 场景 / 排障（英文 one-line-install.en.md）
│   └── （脚本本体在 deploy/binary/install.sh）
├── DEVELOPMENT.md               ← 开发手册（中文）：环境 / 建工具 / 门禁
├── DEVELOPMENT.en.md            ← Developer Guide（英文版，同结构）
├── RELEASE.md                   ← 发布流程：版本号标识 / Release 构建 / changelog 要点 / 一键安装
├── audit-report.md                   ← 早期文档体系的审核记录（历史归档）
├── spec/                        规范层：架构、规范、路线图
│   ├── README.md                项目总览（原 00-总览）
│   ├── 01-域与子类全景.md        20 域 + 60+ 子类概览
│   ├── 02-技术栈与架构.md        技术选型、七层架构、WASM、Worker
│   ├── 03-目录结构.md            monorepo 完整目录树
│   ├── 04-开发规范.md            新增工具流程、meta.ts、红线
│   ├── 05-缺口清单.md            补全的高价值缺口
│   ├── 06-网页结构与信息架构.md   三层 IA、6 模板、三层搜索、SEO
│   ├── 07-路线图.md              阶段 0-4 分批实现计划
│   ├── 08-待决事项.md            ⚠️ 开工前必须拍板的 8 项决策
│   ├── 09-执行编排提示词.md      全流程执行提示词（DAG/批次/角色/DoD）+ 入库审计
│   ├── 10-DevLog规范.md          开发日志智能体规范（角色/格式/规则）
│   └── 11-文档命名规范.md        中英双语命名规则 + 全量文档命名映射表
├── catalog/                     目录层：工具总表与统计
│   └── README.md                870 工具总表 + 汇总统计 + 校验记录
└── tools/                       明细层：20 份分域工具明细
    ├── README.md                分域索引
    └── 01-*.md ~ 20-*.md        每域工具表（工具名/slug/优先级/可行性/依赖/描述）
```

---

## 二、按目的查阅

| 我想…                                      | 看这份                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **把站点装到服务器上（一行命令）**         | 本文 [§零、快速开始](#quick-start)                                                                                     |
| **学会用站点与命令行**                     | [`guide/usage.md`](guide/usage.md)                                                                                     |
| **配端口 / 升级源 / 站点地址**             | [`guide/configuration.md`](guide/configuration.md)                                                                     |
| **出问题了**                               | [`guide/troubleshooting.md`](guide/troubleshooting.md)                                                                 |
| **查 `toolboxctl` 命令怎么用**             | [`../deploy/binary/README.md`](../deploy/binary/README.md) · 或根 [`README.md`](../README.md) 的命令行速查             |
| **想贡献代码**                             | [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                                                                             |
| **查术语的中英对照 / 该怎么翻**            | [`glossary.md`](glossary.md)                                                                                           |
| 快速了解这个项目是什么                     | [`../README.md`](../README.md) · [`spec/README.md`](spec/README.md)                                                    |
| **装环境、跑起来、写第一个工具**           | [`DEVELOPMENT.md`](DEVELOPMENT.md)（英文版 [`DEVELOPMENT.en.md`](DEVELOPMENT.en.md)）                                  |
| 知道总共有哪些工具、多少数量               | [`catalog/README.md`](catalog/README.md)                                                                               |
| 查某个具体工具的 slug / 优先级             | [`tools/`](tools/) 下对应域                                                                                            |
| 搭工程骨架、建目录                         | [`spec/03-目录结构.md`](spec/03-目录结构.md)                                                                           |
| 写第一个工具                               | [`spec/04-开发规范.md`](spec/04-开发规范.md)                                                                           |
| 定页面结构、路由、搜索、SEO                | [`spec/06-网页结构与信息架构.md`](spec/06-网页结构与信息架构.md)                                                       |
| 排开发顺序                                 | [`spec/07-路线图.md`](spec/07-路线图.md)                                                                               |
| 知道哪些事还没定                           | [`spec/08-待决事项.md`](spec/08-待决事项.md)                                                                           |
| 启动全流程执行                             | [`spec/09-执行编排提示词.md`](spec/09-执行编排提示词.md)（先读文末「入库审计」的 3 项拍板清单）                        |
| 给新文档起名 / 查命名规则                  | [`spec/11-文档命名规范.md`](spec/11-文档命名规范.md)                                                                   |
| 查开发日志规范                             | [`spec/10-DevLog规范.md`](spec/10-DevLog规范.md)                                                                       |
| **发包、打 tag、写 changelog、做一键安装** | [`RELEASE.md`](RELEASE.md) + 仓库根 [`CHANGELOG.md`](../CHANGELOG.md)                                                  |
| **部署到服务器（容器 / 二进制）**          | [`../deploy/binary/README.md`](../deploy/binary/README.md)（二进制）· [`../deploy/docker/`](../deploy/docker/)（容器） |
| 看早期的文档审核记录                       | [`audit-report.md`](audit-report.md)                                                                                   |

---

## 三、核心口径（唯一真源）

以下数字为**脚本实测值**，全文档以此为准：

| 维度           | 值                                                                        |
| -------------- | ------------------------------------------------------------------------- |
| 工具总数       | **870**                                                                   |
| 一级分类（域） | **20**                                                                    |
| 大组           | **4**（dev / design / office / life）                                     |
| 子类           | **60+**（走筛选器，不建独立页）                                           |
| 优先级分布     | P0 148 / P1 322 / P2 332 / P3 68                                          |
| 可行性分布     | A 662 / B 59 / C 79 / D 58 / E 12                                         |
| 纯前端可实现率 | A+B+C = **92.0%**                                                         |
| 页面总数       | 870 工具页 + 4 大组页 + 20 分类页 + 10-20 集合页 + 10 静态页 ≈ **924 页** |

> 统计口径与校验记录见 [`catalog/README.md`](catalog/README.md)。

---

## 四、文档约定

1. **文件命名**：`NN-主题.md`，编号即推荐阅读顺序；`README.md` 为该目录入口。
2. **术语统一**：
   - **大组**（group）= 4 个用户心智分组，slug 为 `dev` / `design` / `office` / `life`
   - **域**（category）= 20 个一级分类，对应 `features/` 目录
   - **子类**（sub-category）= 60+ 个二级分组，仅作筛选器
3. **引用方式**：同目录用相对文件名，跨目录用相对路径（如 `../tools/01-文本与内容.md`）。
4. **数字口径**：凡「约 / 预估 / 目标」表述均为设计目标，「实测」表述为脚本统计结果，冲突时以**实测**为准。
5. **状态标记**：`✅` 已核实 / `⚠️` 待确认 / `🔄` 本轮修改。

---

## 五、变更记录

### 第一轮整理（三层重组）

做了三件事：**归位、修复、补齐**。

- **归位**：原 `docs/toolbox-spec/` 单层平铺的 29 份文档，按「规范 / 目录 / 明细」三层重组为 `spec/`、`catalog/`、`tools/`。
- **修复**：修正 4 处残留裸 slug、3 处口径不一致、1 处标题与内容矛盾。
- **补齐**：新增本文与 `spec/08-待决事项.md`、`tools/README.md`（29 → 32 份）。

### 第二轮追加（执行提示词入库，2026-09-23）

- **入库**：执行编排提示词（`spec/09`）与 DevLog 规范（`spec/10`）原文照录（32 → 34 份）。
- **审计**：执行提示词 vs 既有文档，**2 处 blocking**（4组↔20域：8 域 240 工具无归属；批次规模沿用旧估算 640/90/80/45/15 ≠ 实测 662/59/79/58/12）+ 12 处口径差异，详见 [`spec/09`](spec/09-执行编排提示词.md) 文末「入库审计」。
- **拍板登记**：待决 #1 框架 = **Vite**、#3 粒度 = **870 独立路由**（由执行提示词实质确定），已记入 [`spec/08`](spec/08-待决事项.md) 决策记录。
- **日志基建**：`.agent/logs/{devlog.md, events.jsonl}` 建立，首条日志 `[DOC/B-1]` 写入。

### 第三轮追加（开发手册双语版，2026-09-23）

- **新增**：`DEVELOPMENT.md` / `DEVELOPMENT.en.md`（34 → 36 份），面向开发者的落地手册：环境、catalog 机制、20 域↔4 组真源表、元数据契约、T1–T6 选型、建工具 6 步、门禁与红线、排障。
- **口径固化**：手册第五节给出 20 域 ↔ 4 大组的**唯一真源表**（dev 360 / design 200 / office 60 / life 250 = 870），覆盖执行提示词第六节的冲突描述（待决 #2 消解）。
- **决策登记**：新增 3 项已拍板——执行宿主 = **Windows 原生**（不迁移 WSL2）、批次规模改实测 **662/59/79/58/12**、4 组映射采用真源表。
- **冲突登记**：手册第十五节集中列出 6 处 spec 内部不一致（审核报告死路径、`spec/03` §3 文件清单过时、`spec/02` §7 作废项、路线图表未同步、`spec/05` Mock API 重复计数、`spec/09` 批次规模旧值），执行时以手册口径为准，spec 原文待修订。
- 待决收敛为 4 项（A i18n / B 21→20 / C WASM 分发 / D D 类提示样式）。

### 第四轮追加（文档命名规范，2026-09-23）

- **新增**：`spec/11-文档命名规范.md`（36 → 37 份），双语命名规则 8 条 + 中英对应原则 5 条 + 常见类型示例 12 组 + 本项目全量命名映射表（38 项）。
- **推荐方案**：**英文做文件名、中文做展示名**——文件名用 ASCII 避免中文路径在 git/脚本中的转义成本，中文名用于 H1 与索引表检索。备选「全中文文件名」方案同步给出。
- 待迁移：若采纳英文文件名，需同步替换 36 份文档中约 40 处交叉引用，清单见 `spec/11` §5。

### 第五轮追加（补齐安装入口层，2026-09-24）

**背景**：此前的文档体系缺了「入口层」——一键安装命令只存在于 `RELEASE.md` §四与
`deploy/binary/README.md` §3.1 两处深水区，仓库根**没有 `README.md`**，
且 `RELEASE.md` 里那条唯一的一键安装链接（`raw.githubusercontent.com/.../install.sh`）
因仓库当前为 private 而**实测返回 404**。

- **新增**：仓库根 `README.md`（中文落地页）与 `README.en.md`（英文版），
  含定位、三条部署链路、`toolboxctl` 命令速查表、目标机要求、项目结构与文档索引。
- **新增**：本文 [§零、快速开始](#零快速开始把站点装起来)——可复制执行的安装 / 容器 / 本地开发命令，
  并在「按目的查阅」表顶部加了两行入口。
- **修正**：`RELEASE.md` §四的一键安装链接改为**与 tag 绑定的 Release 资产入口**，
  并标注 private 仓库下的三种解法；`install.sh` 头部注释同步。
- **补齐**：`DEVELOPMENT.md` / `DEVELOPMENT.en.md` 此前**完全未提及** `deploy/binary/` 这条链路，
  现补 §20「部署与发布（三条链路）」。
- **新增**：`deploy/binary/README.md` 顶部「最短路径」卡片（原安装说明在第 74 行，需长距离滚动）。

### 第六轮追加（大厂风格改造：工程配置 + 双语文档体系，2026-09-24）

**背景**：此前仓库有文档但没有**工程约束**——格式靠自觉、文档靠自觉、双语靠自觉。
本轮把这三种「自觉」变成可执行的检查。

- **工程配置**：新增 `.editorconfig`、`.prettierrc.json`、`.prettierignore`、
  `.gitattributes`（换行统一 LF）、`eslint.config.js`（flat config，全仓一份）。
  根脚本新增 `lint` / `lint:fix` / `format` / `format:check` / `check:docs` / `verify`；
  `turbo.json` 移除无人使用的 `lint` 任务（一份配置扫全仓，无需按包 fan-out）。
- **双语文档体系**：新增 `docs/guide/`（指南索引 + 安装与快速上手 + 使用示例 +
  配置说明 + 排障，四篇中英成对）、`docs/glossary.md`（术语真源）、
  仓库根 `CONTRIBUTING.md`、本文英文版 `README.en.md`。
- **一致性校验**：新增 `scripts/check-docs.ts`（9 项检查，见本文 §四与 `glossary.md` §五），
  接入 `pnpm check:docs` 与 CI。双语文档从「靠人记得」变成「漏一边就失败」。
- **在线体验地址登记**：`https://006336.xyz/` 与 `https://www.006336.xyz/`，
  在根 README 与 `guide/getting-started.md` 中标注**尚未上线**；
  `SITE_ORIGIN` 默认值由占位地址 `https://example.com` 改为正式域名。
- **顺带修掉 3 个真实缺陷**：CI 只监听 `main` 而实际分支是 `master`（等于 CI 从未在 push 时跑过）、
  `loadTool` 每次渲染都新建 `lazy()` 包装（切语言会卸载重挂工具、丢掉用户输入）、
  搜索弹层背板是 `<div onClick>`（键盘不可达，a11y 规则指出的是真缺陷而非误报）。
