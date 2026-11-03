# 构建系统、脚本与 CI/CD 审计报告

**审计日期**：2026-11-03
**审计人员**：Backend Developer (Agent 04) / DevSecOps Engineer (Agent 06)
**状态**：COMPLETED

---

## 执行摘要

Toolbox 采用 **pnpm + Turborepo + Vite 8** 构建体系，配合 **多脚本校验链**、**Docker 多阶段构建**、**二进制部署脚本**、**GitHub Actions CI/CD**，整体工程化程度高，自动化完备。

---

## 1. pnpm Monorepo 与 Turbo 配置

| 配置项                 | 状态    | 说明                                                          |
| ---------------------- | ------- | ------------------------------------------------------------- |
| **pnpm workspace**     | ✅ 标准 | `pnpm-workspace.yaml` 包含 `apps/*`、`packages/*`、`deploy/*` |
| **Turborepo pipeline** | ✅ 完整 | `turbo.json` 定义 `build`/`test`/`lint`/`typecheck` 依赖图    |
| **并发控制**           | ✅ 优化 | `build --concurrency=1` 避免内存溢出，`dev` 并行              |
| **缓存键**             | ✅ 合理 | `turbo.json` 基于文件内容哈希，远程缓存可配置                 |

**turbo.json 关键配置**：

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "dist-ssr/**"] },
    "test": { "dependsOn": [] },
    "lint": { "dependsOn": [] },
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

---

## 2. Package.json Scripts 链路完整性

| 脚本        | 用途                                                             | 依赖     | 状态        |
| ----------- | ---------------------------------------------------------------- | -------- | ----------- |
| `dev`       | `turbo run dev`                                                  | -        | ✅          |
| `build`     | `turbo run build --concurrency=1`                                | -        | ✅          |
| `build:ssg` | `generate:sitemap` → `web:build` → `web:build:ssr` → `prerender` | 完整链路 | ✅          |
| `typecheck` | `pnpm -r --if-present run typecheck`                             | 并行     | ✅          |
| `test`      | `pnpm -r --if-present run test`                                  | 并行     | ✅          |
| `lint`      | `eslint .`                                                       | 全局     | ✅          |
| `format`    | `prettier --write .`                                             | 全局     | ✅          |
| `verify`    | 9 步完整校验链                                                   | 串行     | ✅ 核心门禁 |

**verify 链路**：`check:tools` → `check:source-org` → `check:env` → `check:docs` → `check:licenses` → `lint` → `format:check` → `typecheck` → `test`

---

## 3. Vite 8 配置与 SSG 预渲染

| 配置项           | 状态                         | 说明                                   |
| ---------------- | ---------------------------- | -------------------------------------- |
| **Vite 版本**    | 8.3.5                        | 最新稳定                               |
| **React 插件**   | `@vitejs/plugin-react` 6.1.1 | Fast Refresh 支持                      |
| **Tailwind v4**  | `@tailwindcss/vite`          | CSS-first 配置                         |
| **WASM 插件**    | `vite-plugin-wasm`           | qpdf-wasm 支持                         |
| **SSG 预渲染**   | ✅ 完成                      | `prerender.ts` 生成 826 个静态页面     |
| **SSR 入口**     | `entry-server.tsx`           | `build:ssr` 产出 `dist-ssr`            |
| **Chunk 分割**   | `manualChunks` 策略          | 工具级 `tool-{slug}` + 共享 `app-core` |
| **资源内联阈值** | 默认 4KB                     | 小图片/Base64 内联                     |

**预渲染产出**：826 个静态 HTML (798 工具页 + 5 大组页 + 21 域页 + 首页 + 索引页 + 404)

---

## 4. 核心脚本审计 (scripts/)

| 脚本                  | 用途                                                | 幂等性    | 错误处理               | 状态        |
| --------------------- | --------------------------------------------------- | --------- | ---------------------- | ----------- |
| `generate-catalog.ts` | 扫描工具目录 → 生成 `tools.generated.ts` + 搜索索引 | ✅ 幂等   | Zod 校验失败退出码 1   | ✅ 成熟     |
| `generate-sitemap.ts` | 基于 catalog 生成 `sitemap.xml`                     | ✅ 幂等   | XML 生成错误抛出       | ✅ 成熟     |
| `check-tools.ts`      | 元数据契约 + 源码组织 + API 配置校验                | ✅ 幂等   | 详细错误报告，非零退出 | ✅ 核心门禁 |
| `check-source-org.ts` | 目录结构、文件集、跨工具 import 校验                | ✅ 幂等   | 详细报告               | ✅ 核心门禁 |
| `check-env-config.ts` | `.env.example` 登记、VITE_ 前缀、密钥泄漏           | ✅ 幂等   | 36 API 工具全检        | ✅ 核心门禁 |
| `check-docs.ts`       | 双语配对、结构对齐、链接/锚点、在线状态             | ✅ 幂等   | 锚点不存在报错         | ✅ 核心门禁 |
| `check-licenses.ts`   | SPDX 许可证扫描、强 copyleft 拦截                   | ✅ 幂等   | EPL/LGPL 需确认        | ✅ 核心门禁 |
| `prerender.ts`        | SSG 预渲染 826 页面                                 | ⚠️ 非幂等 | 单页失败不阻塞整体     | ⚠️ 需改进   |
| `check-licenses.ts`   | SPDX 许可证扫描                                     | ✅ 幂等   | 宽松许可通过           | ✅          |

**改进建议**：

- `prerender.ts`：单页失败应记录并继续，最终汇总失败列表，而非中断
- 增加 `--dry-run` 模式预检

---

## 5. Docker 多阶段构建

| 阶段        | 基础镜像            | 关键操作                              | 产出                |
| ----------- | ------------------- | ------------------------------------- | ------------------- |
| **builder** | `node:24-alpine`    | `pnpm install` → `pnpm build:ssg`     | 静态产物 + SSR 产物 |
| **runtime** | `nginx:1.27-alpine` | 复制产物 → 渲染 nginx.conf → 健康检查 | 最终镜像 ~45MB      |

**安全加固**：

- ✅ 非 root 用户 (`nginx:nginx`, UID 101)
- ✅ 只读根文件系统 + `tmpfs` 可写目录
- ✅ 仅 `NET_BIND_SERVICE` capability
- ✅ `no-new-privileges` 安全选项
- ✅ OCI 标签追溯

**docker-compose.yml**：

- ✅ 资源限制 (CPU 1.0, Memory 512M)
- ✅ 健康检查 `/healthz` (30s 间隔, 3 次重试)
- ✅ 结构化日志 (json-file, 10MB, 3 文件)
- ✅ 独立 bridge 网络 (172.28.0.0/16)

---

## 6. 二进制部署

| 组件             | 状态                            | 说明    |
| ---------------- | ------------------------------- | ------- |
| **打包脚本**     | `deploy/binary/build-bundle.sh` | ✅ 成熟 | 打包静态产物 + nginx + systemd                |
| **安装脚本**     | `deploy/binary/install.sh`      | ✅ 成熟 | 支持自建源、版本指定、dry-run                 |
| **toolboxctl**   | `deploy/binary/toolboxctl`      | ✅ 成熟 | install/upgrade/rollback/status/health/backup |
| **systemd 单元** | `toolbox.service.tpl`           | ✅ 标准 | `Type=notify`、`Restart=on-failure`           |
| **nginx 模板**   | `nginx.conf.tpl`                | ✅ 标准 | `SITE_ORIGIN`/`VERSION` 注入、健康检查端点    |

**验证脚本**：`verify-binary-deploy.sh`、`verify-binary-local.sh`、`verify-release-source.sh`、`verify-nginx-config.sh`

---

## 6. GitHub Actions CI/CD

| Workflow      | 触发     | 关键 Job                                   | 权限最小化                              |
| ------------- | -------- | ------------------------------------------ | --------------------------------------- |
| `ci.yml`      | push/PR  | `verify` → `build` → `test`                | ✅ `contents: read`、`id-token: write`  |
| `release.yml` | tag push | `build` → `package` → `release` → `deploy` | ✅ `contents: write`、`packages: write` |

**矩阵策略**：

- Node.js: 24.x (LTS)
- OS: ubuntu-latest

**安全**：

- ✅ `permissions` 显式最小化
- ✅ `actions/checkout@v4`、`pnpm/action-setup@v4`
- ✅ artifact 保留 90 天
- ✅ 依赖缓存 `pnpm store path`

---

## 问题清单与优化建议

| 编号   | 严重级 | 问题                   | 影响                | 建议                                 | 预估工时 |
| ------ | ------ | ---------------------- | ------------------- | ------------------------------------ | -------- |
| CI-001 | P1     | `prerender.ts` 非幂等  | 单页失败阻塞全量    | 改为记录失败列表，最终汇总报错       | 8h       |
| CI-002 | P2     | Turbo 远程缓存未配置   | CI 耗时 ~5min       | 配置 Vercel Remote Cache 或自建      | 4h       |
| CI-003 | P2     | Docker 镜像未签名      | 供应链安全          | 引入 cosign/notation 签名验证        | 8h       |
| CI-004 | P2     | 无依赖更新自动化       | 依赖滞后            | 引入 Dependabot/Renovate 定期 PR     | 4h       |
| CI-005 | P3     | 无性能基准回归检测     | 体积/速度回归无感知 | 引入 `bundlesize`/`lighthouse-ci`    | 16h      |
| CI-006 | P3     | 二进制部署无自动化测试 | 部署回归风险        | 增加 `verify-binary-deploy.sh` 到 CI | 8h       |

---

## 结论

**整体评级：A- (优秀)**

- ✅ Monorepo/Turbo/Vite 配置成熟，脚本链路完整，门禁严格
- ✅ Docker/二进制双部署形态成熟，安全加固到位
- ✅ GitHub Actions 权限最小化，矩阵策略合理
- ⚠️ `prerender.ts` 非幂等、缺乏远程缓存、缺乏性能回归检测

**整体评级：A-**

---

_报告生成时间：2026-11-03T18:00:00+08:00_
