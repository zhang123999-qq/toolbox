# 变更日志

本文件记录所有值得注意的变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)（`MAJOR.MINOR.PATCH`）。
每个版本对应一个 git tag（`vX.Y.Z`）与一个 GitHub Release，
Release 附件即该版本的可部署产物（见 [`docs/RELEASE.md`](docs/RELEASE.md)）。

## [未发布]

### 新增

- **工程配置**：ESLint（flat config，含 React / hooks / 可访问性规则）、Prettier、
  EditorConfig、`.gitattributes`（换行统一 LF）；新增 `pnpm lint` / `format` / `format:check` /
  `check:docs` / `verify` 脚本，CI 增加静态检查门禁
- **双语文档体系**：`docs/guide/`（安装与快速上手 / 使用示例 / 配置说明 / 排障，四篇中英成对）、
  `docs/glossary.md`（术语真源 + 禁用译法）、`CONTRIBUTING.md`、`docs/README.en.md`
- **文档一致性校验**：`pnpm check:docs` 机检双语配对、结构对齐、链接与锚点、术语统一、
  在线地址与「尚未上线」标注、新文档是否已入索引

### 修复

- **声明的 Node 版本低于工具链真实下限**：`engines.node` 写 `>=20`，但测试环境 jsdom@30 的
  engines 是 `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`，其依赖 undici@8 要求 `>=22.19.0`。
  Node 20 上 jsdom 环境根本无法启动（`webidl.util.markAsUncloneable is not a function`），
  3 个组件测试文件全部报环境错误。现 CI 改用 Node 24，engines 修正为真实下限，
  文档里所有「Node ≥ 20」的口径同步更新
- **CI 的 pnpm 版本被指定两次**：workflow 里写了 `version: 12`，`package.json` 里又有
  `packageManager: pnpm@12.3.4`，`pnpm/action-setup` 直接拒绝执行——这条流水线从未成功跑过
  一次，而「push 不触发」恰好把它掩盖了。现由 action 读取 `packageManager`，版本只留一个真源
- **`typecheck` / `test` 改走 pnpm 递归运行器**：二者都是纯扇出、不需要依赖图，
  turbo 却会稳定触发 `os error 231`，导致 `pnpm verify` 在本机跑不通（文档却要求提交前跑它）
- **`scripts/generate-sitemap.ts` 漏格式化**：改成构建期生成 robots.txt 之后没重跑 Prettier，
  由 CI 的 `format:check` 抓出——本地门禁跑在改动之前，结论已过期
- **CI 从未在 push 时运行**：`push` 触发分支写的是 `main`，而默认分支是 `master`，
  只有开 PR 才会跑
- **切换语言会丢掉工具页的输入**：`loadTool` 每次渲染都新建 `lazy()` 包装，
  组件身份变化导致 React 卸载重挂工具组件
- **搜索弹层的遮罩层键盘不可达**：背板是 `<div onClick>`，只有鼠标能关；
  改为真正的 `<button>`（Esc 之外的第二条关闭路径）
- **sitemap 与 canonical 指向占位域名**：`https://example.com` 硬编码在 5 处
  （含 `robots.txt` 的 Sitemap 指令），现统一由 `packages/catalog/src/site.ts` 的
  `SITE_ORIGIN` 派生；`robots.txt` 改为构建期生成，不再手工维护
- **`pnpm build:ssg` 本地不生成 sitemap**：缺少生成步骤且顺序与 Dockerfile 不一致，
  产出的 `dist/` 用的是上次遗留的 sitemap；现已对齐为
  sitemap → 客户端构建 → SSR 构建 → 预渲染

### 计划中

- 铺量 P0 批次（148 个工具），先小批量（10 个）验证再上量
- 补齐工程内部文档的英文版（`docs/spec/`、`docs/tools/` 等 36 份，`pnpm check:docs` 会持续统计）
- Orama 正式接入 + 中文分词、拼音搜索
- T1 / T3–T6 页面模板

## [0.0.1] - 2026-09-24

首个可部署版本：站点骨架 + 示例工具 + 双语/主题 + 两条部署链路
（容器部署、二进制部署）。工具数 1/870，铺量前的工程基座已完整。

### 新增

**工程基座**

- pnpm + Turborepo 单体仓库，`packages/catalog` 作为 20 域 ↔ 4 大组唯一真源表
  （合计 870，脚本校验闭合），含 Zod 元数据契约与可行性→布尔字段强制映射
- 路由全部由 catalog 派生，新增工具只需建目录 + `meta.ts` 并执行
  `pnpm generate:catalog`（红线：禁止手写路由表）
- `scripts/`：目录生成、元数据校验、sitemap 生成、SSG 预渲染
- GitHub Actions 流水线：按门禁顺序串联校验 → 类型检查 → 测试 → 构建 → SSG

**站点**

- Vite 6 + React 19 + TypeScript + Tailwind v4，页面级懒加载
- SSG 预渲染：27 个静态页 + `404.html`，注入 title / description / canonical /
  JSON-LD，工具页对爬虫可见真实 DOM
- 首页 Landing Page：主视觉、核心亮点、4 大组、20 域速览、已上线工具、底部 CTA，
  全响应式（375px 无横向滚动）
- 中英双语实时切换：文案 key 类型安全（英文包为 `Record<MessageKey, string>`，
  漏译即编译失败），切换同步 `<html lang>` 与文档标题
- 明暗主题切换：首帧前由内联脚本应用，无闪动
- 语言与主题偏好落 `localStorage`，刷新与再次访问保持
- 全局搜索（⌘K / Ctrl+K）

**示例工具**

- `json-formatter`（#131，data-format/dev，P0，T2 模板）：格式化、压缩、校验、
  缩进与键排序，8 文件规范齐全（含单元测试、组件测试、E2E）

**部署**

- 容器部署：多阶段 Dockerfile + 独立 nginx 配置（SPA 路由、gzip、长缓存、
  WASM MIME、真实 404），镜像约 75MB
- 二进制部署（`deploy/binary/`）：自包含 bundle + `toolboxctl` 管理 CLI，
  覆盖安装 / 卸载 / 日常运维 / 在线升级四类场景；升级含整包与逐文件双重校验，
  健康检查失败自动回滚；使用**独立 nginx 实例**，不影响目标机其它站点
- 一键安装：`deploy/binary/install.sh`，支持 `curl … | sudo sh` 单条命令安装

### 修复

- 未知路径返回 200 + 首页内容（软 404）→ 改为真实的 404 状态码并渲染 `404.html`
- 构建分块：共享模块（i18n 等）被卷入某个工具 chunk，导致首屏加载整包工具代码
  → 显式划分 `app-core`；工具 chunk 13.62KB → 5.08KB
- 工具元数据英文文案不生效：`generate-catalog` 的字段清单为硬编码，未同步可选字段
- `toolboxctl` 经 `/usr/local/bin` 软链调用时读不到版本、找不到配置模板
  → 解析脚本真实路径
- 移动端导航按钮的可访问名与可见文字不一致（读屏念错）

### 已知限制

- 工具元数据仅 `json-formatter` 提供英文文案，其余工具英文环境下回落中文
- 静态产物固定中文口径，未提供 `/en` 路由（英文仅在客户端生效）
- 首屏 JS gzip ≈ 94.6KB，超出文档原定 50KB 预算（React 19 框架基线所致，待拍板放宽）
- GitHub 仓库若为私有，`curl` 一键安装需带 `GITHUB_TOKEN`，或改用内网发布源

[未发布]: https://github.com/zhang123999-qq/toolbox/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/zhang123999-qq/toolbox/releases/tag/v0.0.1
