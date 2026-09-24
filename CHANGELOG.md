# 变更日志

本文件记录所有值得注意的变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)（`MAJOR.MINOR.PATCH`）。
每个版本对应一个 git tag（`vX.Y.Z`）与一个 GitHub Release，
Release 附件即该版本的可部署产物（见 [`docs/RELEASE.md`](docs/RELEASE.md)）。

## [未发布]

### 计划中
- 铺量 P0 批次（148 个工具），先小批量（10 个）验证再上量
- ESLint 接入（`pnpm lint` 目前为占位）
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
