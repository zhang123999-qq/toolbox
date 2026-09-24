# 源码组织规范 · 存量整改报告

> 规范正文：[`docs/source-organization.md`](../../docs/source-organization.md)
> 机检：[`scripts/check-source-org.ts`](../../scripts/check-source-org.ts)（`pnpm check:source-org`）
> 审计：[`source-org-audit.md`](source-org-audit.md)

## 一、结论

**本次无需整改：存量 75 个工具全部满足规范 §1–§3。**

| 指标             | 值                       |
| ---------------- | ------------------------ |
| 扫描工具目录     | 75                       |
| catalog 注册工具 | 75                       |
| 发现违规         | **0**                    |
| 已整改           | **0**（无可整改项）      |
| blocked          | **0**                    |
| 行为回退         | 无（未改动任何工具源码） |

按规范「禁止」条款：不修改已符合规范的工具。因此本次交付只有**规范文档 + 机检脚本 + 审计报告**，
不动存量源码。

## 二、整改清单（按违规类型分组）

| 违规类型               | 条数 | 处置 |
| ---------------------- | ---- | ---- |
| 多工具混放同一文件夹   | 0    | —    |
| 文件夹内文件缺失或多余 | 0    | —    |
| 跨工具文件夹 import    | 0    | —    |
| 命名冲突或不合规       | 0    | —    |
| 业务逻辑外置           | 0    | —    |

## 三、为什么存量是干净的

不是运气，是此前两条既有约束已经把形态固定住了：

1. `check:tools` 早就强制「8 文件基线」（`meta` / `schema` / `utils` / `Tool` / `test` /
   `Tool.test` / `e2e` / `README`），缺一即失败 —— 这正是本规范 §2 的文件集要求。
2. 「工具之间不互相 import」是既有八条红线之一，跨域共用逻辑一律上提到 `apps/web/src/lib/`
   （现有 `text` / `diff` / `table` / `ai` / `zerowidth` / `pipeline` 六份）。

也就是说本规范把**已经默认遵守的约定**显式化、并补上机器校验，防止后续铺量到 870 个工具时漂移。

## 四、进度

| 阶段                      | 状态 | 说明                             |
| ------------------------- | ---- | -------------------------------- |
| 1. 全量扫描生成 audit     | ✅   | `pnpm check:source-org --report` |
| 2. 按违规类型分组         | ✅   | 五类均 0 条                      |
| 3. 逐项整改 + 单工具验证  | ✅   | 无需整改                         |
| 4. 功能不回退对比         | ✅   | 见第五节                         |
| 5. 全量 check 与 E2E 重跑 | ✅   | 见第五节                         |
| 6. 整改总结               | ✅   | 本文                             |

## 五、不回退基线（整改前 → 后）

| 项            | 整改前                | 整改后                | 判定             |
| ------------- | --------------------- | --------------------- | ---------------- |
| 单测文件      | 157 passed            | 157 passed            | 持平 ✅          |
| 单测用例      | 1179 passed           | 1179 passed           | 持平 ✅          |
| E2E 用例      | 231 passed / 0 failed | 231 passed / 0 failed | 持平 ✅          |
| `check:tools` | 全部通过              | 全部通过              | 持平 ✅          |
| lint / TS     | 0 / clean             | 0 / clean             | 持平 ✅          |
| 覆盖率        | 未采集（见下）        | 未采集（见下）        | 无法比对，已登记 |

**覆盖率说明（不掩饰）**：仓库未安装 coverage provider（`apps/web` 依赖里只有 `vitest`，
没有 `@vitest/coverage-v8`），因此无法给出整改前后的覆盖率数值。本次未改动任何工具源码，
以「用例数持平 + 全绿」作为不回退的判据；补覆盖率采集登记为待办（见第七节），
**不是 blocked 项**，也不允许为凑这个指标而删测试。

## 六、实测

| 命令                    | 结果                                     |
| ----------------------- | ---------------------------------------- |
| `pnpm check:source-org` | ✅ 75/75 合规，退出码 0                  |
| `pnpm check:tools`      | ✅ 全部通过                              |
| `pnpm check:docs`       | ✅ 0 error / 1 warning（历史中文文件名） |
| `pnpm check:licenses`   | ✅ 0 拒绝                                |
| `pnpm lint`             | ✅ 0                                     |
| `pnpm format:check`     | ✅                                       |
| `pnpm typecheck`        | ✅ 4 个包 clean                          |
| `pnpm test`             | ✅ 1179 passed（157 文件）               |
| E2E（Playwright）       | ✅ 231 passed / 0 failed（75 份 spec）   |

E2E：本机 `ms-playwright` 为空、无 Playwright 自带内核，用系统已装的 Edge
（`launchOptions.executablePath`）驱动 75 份 `e2e.spec.ts` 实跑。

## 七、待办（非 blocked）

1. 装 `@vitest/coverage-v8` 并在 CI 产出覆盖率，让「覆盖率不下降」可机检而非靠用例数代理。
2. 规范 §3 里 `packages/ui`、`packages/tools-core`、`packages/wasm`、`packages/pwa`、
   `services`、`hooks` 尚未落地；落地后需确认它们不反向 import 具体工具（机检已覆盖）。
3. 铺量到 870 个工具时，把 `pnpm check:source-org --report` 的审计产物纳入每次批次收尾。
