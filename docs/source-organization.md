# 源码组织规范

> **中文** | [English](source-organization.en.md)
> 本文规定源码**放在哪、叫什么、能依赖谁**，是【强制约束】：机检不通过则 CI 失败、禁止合并。
> 核心原则一句话：**一个工具 = 一个独立文件夹，文件夹内自包含，禁止跨工具依赖。**
> 配套机检：`pnpm check:source-org`（脚本 [`scripts/check-source-org.ts`](../scripts/check-source-org.ts)）。

---

## 一、一工具一文件夹原则【强制约束】

- 每个工具必须且只能对应一个独立文件夹，路径固定为 `apps/web/src/tools/<tool-id>/`。
- 文件夹内自包含该工具的全部实现，允许且只允许包含这 8 个文件：

  ```text
  apps/web/src/tools/<tool-id>/
  ├── meta.ts          工具元数据（真源，改完必须重跑 generate:catalog）
  ├── schema.ts        Zod 输入 / 选项契约
  ├── utils.ts         纯函数实现（不依赖 React、不碰 DOM）
  ├── Tool.tsx         唯一组件入口，只能用 T1–T6 模板
  ├── test.ts          utils 单测
  ├── Tool.test.tsx    组件测试
  ├── e2e.spec.ts      Playwright 用例
  └── README.md        工具说明（选项 / 数据流向 / 限制 / 示例）
  ```

- 文件夹之间严格隔离：**禁止跨工具文件夹 import**（相对路径里出现 `../<其它工具>/` 即违规）。
- 禁止在工具文件夹内定义**仅供其他工具使用**的公共逻辑；确实通用的，上提到 `apps/web/src/lib/` 或 `packages/`。
- 禁止把多个工具塞进同一个文件夹（一个目录出现多份 `*Tool.tsx` 即判定为混放）。

---

## 二、命名规范

| 对象       | 约束                                                                                           | 正例                   | 反例                       |
| ---------- | ---------------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| 文件夹名   | kebab-case、全局唯一、**与 catalog 中的 id 一致**                                              | `json-formatter/`      | `jsonFormatter/`、`tool1/` |
| 内部文件名 | 固定 8 个：`meta` / `schema` / `utils` / `Tool` / `test` / `Tool.test` / `e2e.spec` / `README` | `utils.ts`             | `helper.ts`、`common.ts`   |
| `meta.ts`  | `id` 与 `slug` 必须与文件夹名同名                                                              | `id: 'json-formatter'` | `id: 'jsonFormatter'`      |

- 文件夹名与工具功能一一对应，语义清晰、无歧义。
- 禁止 `tool1/`、`utils/`、`helpers/`、`misc/` 这类无语义命名——它们会让检索与 code review 同时失效。

---

## 三、依赖范围

| 类别     | 范围                                                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 允许     | 标准库、第三方库（须过 `pnpm check:licenses`）；项目公共基础设施 `packages/catalog`、`packages/search`、`packages/config`、`apps/web/src/lib`、`apps/web/src/components/tool/templates`、`apps/web/src/{i18n,theme}` |
| 允许     | 随工程推进开放的公共包：`packages/ui`、`packages/tools-core`、`packages/wasm`、`packages/pwa`、`services`、`hooks`（尚未落地，落地后同样允许）                                                                       |
| **禁止** | 跨工具文件夹 import                                                                                                                                                                                                  |
| **禁止** | 把工具业务逻辑外置到**其它工具**目录（该逻辑确实通用时才可上提到公共包，且上提后原工具不得反向被公共层依赖）                                                                                                         |

「公共层反向依赖某个具体工具」等价于业务逻辑倒灌，机检会直接判违规（`apps/web/src/{lib,components,i18n,theme}` 与 `packages/` 不得 import `tools/<某工具>`）。

---

## 四、合规检查

### 4.1 校验命令与 CI

```bash
pnpm check:source-org                  # 只校验，违规退出码 1
pnpm check:source-org --report         # 额外写出审计报告
```

新增或修改任何工具前必须先跑；CI 中作为**必过项**，失败禁止合并。本地的 `pnpm verify` 已包含这一项。
违规清单按 `{ tool, files, violations, suggestions }` 四项输出，可直接照着 suggestions 改。

### 4.2 机检覆盖的六条规则

| #   | 规则                | 判定方式                                                                              |
| --- | ------------------- | ------------------------------------------------------------------------------------- |
| 1   | 目录 ↔ catalog 对应 | 子目录名必须是 catalog 中某个工具 id；反向也要一一对应                                |
| 2   | 标准文件集          | 8 个文件**缺一即违规**，多余文件同样违规                                              |
| 3   | 跨工具 import       | 相对 import 路径命中 `../<其它工具>/`                                                 |
| 4   | 多工具混放          | 同一目录出现多份 `*Tool.tsx`                                                          |
| 5   | 命名合规            | 非 kebab-case、与 catalog id 不一致、与 `meta.ts` 的 `id` / `slug` 不一致、目录名重复 |
| 6   | 公共层反向依赖      | 公共层 import 了 `tools/<某工具>`（业务逻辑外置 / 倒灌）                              |

### 4.3 审计报告

全量审计输出 `.agent/reports/source-org-audit.md`，按违规类型分组列出：

- 多工具混放同一文件夹
- 文件夹内文件缺失或多余
- 跨工具文件夹 import
- 命名冲突或不合规
- 业务逻辑外置

---

## 五、存量整改

### 5.1 整改流程

对已存在的所有源码（无论完成与否）同步整改，把违反规范的结构重构为「一工具一文件夹」。每改一个工具立即跑：

```bash
pnpm check:source-org
pnpm test <tool-id>
pnpm playwright test <tool-id>
```

全部改完后重跑全量：`pnpm check:source-org` → `pnpm verify` → `pnpm build:ssg`。

### 5.2 不回退基线

| 要求         | 判定                                                               |
| ------------ | ------------------------------------------------------------------ |
| 功能不回退   | 整改前后单测、E2E 用例数**只增不减**，全绿                         |
| 覆盖率不下降 | 整改后覆盖率不低于整改前；缺指标时以用例数为准并登记               |
| 整改留痕     | 清单、进度、blocked 项写入 `.agent/reports/source-org-refactor.md` |
| 禁止行为     | 不删除测试、不降低覆盖率、不把公共逻辑塞回工具文件夹、不跳过 CI    |

---
