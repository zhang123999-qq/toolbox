# 工具库 · 项目开发文档

> **中文** | [English](DEVELOPMENT.en.md)

> 本文是**给开发者看的落地手册**：怎么装环境、怎么建工具、怎么过门禁。
> 架构设计与工具清单在 `spec/` 与 `catalog/`，本文不重复，只讲「怎么做」。
> 版本：v1.0 · 2026-09-23

---

## 〇、本文与其他文档的关系

| 我想…                               | 看这份                                               |
| ----------------------------------- | ---------------------------------------------------- |
| 装环境、跑起来、写第一个工具        | **本文**                                             |
| 了解架构分层、WASM/Worker 方案      | [`spec/02-技术栈与架构.md`](spec/02-技术栈与架构.md) |
| 查完整目录树                        | [`spec/03-目录结构.md`](spec/03-目录结构.md)         |
| 查某个工具的 slug / 优先级 / 可行性 | [`tools/`](tools/) 下对应域文件                      |
| 看 870 条汇总统计                   | [`catalog/README.md`](catalog/README.md)             |
| 看哪些决策还没拍板                  | [`spec/08-待决事项.md`](spec/08-待决事项.md)         |

---

## 一、环境要求

| 组件    | 要求                       | 本机实测 | 必须            |
| ------- | -------------------------- | -------- | --------------- |
| Node.js | ≥ 24.15.0（推荐 24.x LTS） | v24.20.0 | ✅              |
| pnpm    | ≥ 9                        | 12.3.4   | ✅              |
| Docker  | ≥ 24                       | 29.8.0   | ⚠️ 仅阶段验收用 |
| Git     | 任意                       | —        | ✅              |
| WSL2    | 可选                       | 未启用   | ❌ 非必需       |

> **依赖升级的两条边界**（跑完 `pnpm outdated` 先确认，不要见新就升）：
> ① `react-router` 已有 8.x，但 `react-router-dom` 至今没有 8.x，单独升前者必然出现双实例
> （现象与解法见 §18.3）；② TypeScript 7 已发布，但 `typescript-eslint` 对 TypeScript 的
> peer 范围仍是 `>=4.8.4 <6.1.0`，升到 7 会让类型感知的 lint 规则失去支持。

> **关于 WSL2**：执行编排提示词原文要求 WSL2 Ubuntu 22.04，但本项目核心是 TS/前端构建，
> **Windows 原生（Git Bash / PowerShell）可完成全部开发**。Docker 只在最终容器化验收时需要。
> 建议不要为此迁移环境。

### 代理配置（国内网络必需）

包管理器与 git 拉取依赖需要走代理。设一次，写进 shell 启动脚本：

```bash
# ~/.bashrc 或 ~/.zshrc —— 端口按你的实际代理调整（本机实测 10808）
export PROXY=http://127.0.0.1:10808
export http_proxy=$PROXY
export https_proxy=$PROXY

# pnpm / npm 单独配置（走 registry 镜像更稳）
pnpm config set registry https://registry.npmmirror.com
pnpm config set proxy $PROXY
pnpm config set https-proxy $PROXY
```

> ⚠️ Docker 若需拉镜像，在 Docker Desktop → Settings → Resources → Proxies 里单独配，
> 不走 shell 环境变量。

---

## 二、快速上手（5 分钟）

```bash
# 1. 进入仓库根
cd $TOOLBOX_ROOT

# 2. 装依赖
pnpm install

# 3. 启动开发服务（默认 http://localhost:5173）
pnpm dev

# 4. 另开一个终端，跑一次全量校验
pnpm check:tools    # 元数据完整性 + 重复检测
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest 单测
```

**验证成功的标志**：浏览器打开 `/tools/json-formatter`，能看到 T2 双栏布局，
左侧输入 JSON、右侧实时输出，Cmd+K 能搜到「JSON 格式化」。

---

## 三、技术栈（定稿，勿改）

```text
包管理 / 编排   pnpm workspace + Turborepo
构建            Vite（产物纯静态）
框架            React 19 + TypeScript
UI              Tailwind CSS + shadcn/ui
状态            Zustand + TanStack Query
表单 / 校验     React Hook Form + Zod
搜索            Orama
离线            Workbox + IndexedDB
测试            Vitest + Testing Library + Playwright
重任务          Web Worker + WASM
部署            Docker + Nginx / Cloudflare Pages
```

> **框架已定为 Vite，不再讨论 Next.js。** 代价是 SEO 需自行补 SSG 预渲染，
> 阶段 0 必须加入 `vite-plugin-ssr` 或手写预渲染方案。

### WASM 模块（9 个，全部懒加载）

| 用途        | 模块                   | 目录                  |
| ----------- | ---------------------- | --------------------- |
| 图片处理    | `photon-rs`            | `src/wasm/photon`     |
| 大图 / 批量 | `wasm-vips`            | `src/wasm/wasm-vips`  |
| 音视频转码  | `ffmpeg.wasm`          | `src/wasm/ffmpeg`     |
| OCR         | `tesseract.js`         | `src/wasm/tesseract`  |
| PDF 写      | `pdf-lib`              | `src/wasm/pdf-lib`    |
| PDF 读      | `pdfjs-dist`           | `src/wasm/pdfjs`      |
| Office 渲染 | `@neo-office/renderer` | `src/wasm/neo-office` |
| SQLite      | SQLite WASM            | `src/wasm/sqlite`     |
| 本地 LLM    | `wllama` + WebGPU      | `src/wasm/wllama`     |

**硬约束**：任何 WASM 不得打进主包，一律经 `packages/wasm` 的 `loadWasm()` 懒加载并缓存。

---

## 四、核心机制：catalog 唯一真源

这是整个项目的地基，理解它就理解了 80% 的开发流程。

```text
每个工具目录的 meta.ts
        │  （scripts/generate-catalog.ts 扫描聚合）
        ▼
   packages/catalog
        ├── routes.ts        → 路由表（自动生成）
        ├── search-index.ts  → 搜索索引（自动生成）
        ├── categories.ts    → 20 域
        └── groups.ts        → 4 大组
        │
        ├──→ 首页分组展示
        ├──→ 分类页 / 大组页
        ├──→ Cmd+K 搜索
        └──→ sitemap.xml
```

**所以：新增工具 = 建文件夹 + 写 `meta.ts`，其余全自动。**
你**永远不需要**手写路由、改首页、改 sitemap、改搜索索引。

---

## 五、20 域 ↔ 4 大组映射（真源表）

写 `meta.ts` 时 `category` 与 `group` 必须严格按此表，`check-tools.ts` 会校验。

|   # | 域（中文）                | `category`      | `group`  | 工具数 | 编号范围 |
| --: | ------------------------- | --------------- | -------- | -----: | -------- |
|   1 | 文本与内容处理            | `text`          | `dev`    |     70 | 1–70     |
|   2 | 编码 / 加密 / 哈希 / 安全 | `encoding`      | `dev`    |     60 | 71–130   |
|   3 | 数据格式 / 解析 / 转换    | `data-format`   | `dev`    |     60 | 131–190  |
|   4 | 开发 / 运维 / 云原生      | `devops`        | `dev`    |     90 | 191–280  |
|   5 | 时间 / 日期 / 调度        | `datetime`      | `dev`    |     30 | 281–310  |
|   6 | 数学 / 单位 / 金融 / 生活 | `math`          | `life`   |     60 | 311–370  |
|   7 | 随机 / 生成 / 设计        | `random`        | `design` |     50 | 371–420  |
|   8 | 图片 / 图形               | `image`         | `design` |     60 | 421–480  |
|   9 | PDF / Office / 文档       | `pdf`           | `office` |     60 | 481–540  |
|  10 | 音视频 / 媒体             | `media`         | `design` |     45 | 541–585  |
|  11 | AI / LLM                  | `ai`            | `life`   |     30 | 586–615  |
|  12 | 网络 / SEO / 网站         | `seo`           | `dev`    |     50 | 616–665  |
|  13 | 数据可视化                | `visualization` | `design` |     25 | 666–690  |
|  14 | Web3 / 区块链             | `web3`          | `life`   |     25 | 691–715  |
|  15 | 无障碍 / 国际化           | `a11y`          | `life`   |     25 | 716–740  |
|  16 | 自动化 / API / 测试       | `automation`    | `life`   |     30 | 741–770  |
|  17 | 浏览器扩展 / 油猴         | `extension`     | `life`   |     15 | 771–785  |
|  18 | 游戏开发 / 像素           | `game`          | `design` |     20 | 786–805  |
|  19 | 边缘计算 / Serverless     | `edge`          | `life`   |     15 | 806–820  |
|  20 | 教育 / 学习 / 趣味        | `education`     | `life`   |     50 | 821–870  |

**合计校验**：`dev` 360 + `design` 200 + `office` 60 + `life` 250 = **870** ✅

> ⚠️ 执行编排提示词第六节给出的 4 组文字描述**与此表冲突**（8 个域无归属）。
> **以本表为准**，本表已经过脚本校验且合计闭合。

---

## 六、工具元数据契约

### 6.1 完整字段（16 项，全必填）

```ts
// src/tools/json-formatter/meta.ts
import type { ToolMeta } from '@toolbox/catalog'

export const meta: ToolMeta = {
  // —— 标识 ——
  id: 'json-formatter', // 全局唯一，kebab-case，= 目录名
  slug: 'json-formatter', // URL 片段，与 id 一致
  title: 'JSON 格式化', // 中文展示名
  description: '格式化、压缩、校验 JSON，支持树形查看',

  // —— 归类 ——
  category: 'data-format', // 必须 ∈ 上表 20 个 category
  group: 'dev', // 必须与 category 的归属一致
  tags: ['json', 'format', 'validate'], // 2–5 个，全小写

  // —— 排期与可行性 ——
  priority: 'P0', // P0 | P1 | P2 | P3
  feasibility: 'A', // A | B | C | D | E
  template: 'T2', // T1–T6，见第七节

  // —— I/O 契约 ——
  inputs: ['text'],
  outputs: ['text'],
  options: ['sort', 'indent'],

  // —— 执行特征 ——
  deps: ['jsonc-parser'], // 必须是已安装依赖
  worker: false,
  wasm: false,
  api: false,
}
```

### 6.2 校验规则（`check-tools.ts` 强制执行）

|   # | 规则                                                      |
| --: | --------------------------------------------------------- |
|   1 | `id` 唯一、kebab-case、无空格无大写                       |
|   2 | `slug` === `id`                                           |
|   3 | `category` ∈ 20 域                                        |
|   4 | `group` 与 `category` 的归属一致（按第五节表）            |
|   5 | `tags` 2–5 个，全小写                                     |
|   6 | `priority` ∈ {P0, P1, P2, P3}                             |
|   7 | `feasibility` ∈ {A, B, C, D, E}                           |
|   8 | `template` ∈ {T1, …, T6}                                  |
|   9 | `worker` / `wasm` / `api` 与 `feasibility` 一致（见下表） |
|  10 | `deps` 中的包必须已在 `package.json` 声明                 |

**可行性 → 布尔字段映射（强制）**

| feasibility | 含义                            | worker  | wasm       | api        |
| ----------- | ------------------------------- | ------- | ---------- | ---------- |
| **A**       | 纯 JS                           | `false` | `false`    | `false`    |
| **B**       | WASM                            | 按需    | **`true`** | `false`    |
| **C**       | WebCrypto / WebCodecs / Web API | 按需    | 按需       | `false`    |
| **D**       | 用户自备 API / Key              | 按需    | 按需       | **`true`** |
| **E**       | 需后端                          | 按需    | 按需       | **`true`** |

> **D / E 类工具必须在页面上明示数据流向**，这是红线，不是建议。

### 6.3 slug 命名约束

```text
✅ json-formatter   base64-encode   whois-lookup   sitemap-generate
✅ toml-parse       svgo-optimize   semver-compare

❌ base64       —— 裸名，与 npm 包 / 技术术语冲突
❌ jsonFormatter —— 驼峰
❌ json_formatter —— 下划线
❌ tool-1       —— 无语义
```

规则：**小写 + 中划线 + 语义化 + 不与 npm 包重名**。重名时加语义后缀。

---

## 七、页面模板 T1–T6

| 模板   | 名称   | 布局               | 适用          | 示例                                           |
| ------ | ------ | ------------------ | ------------- | ---------------------------------------------- |
| **T1** | 单栏   | 上输入下输出       | 简单生成类    | `uuid`、`timestamp`、`password-generator`      |
| **T2** | 双栏   | 左右分栏，宽度可拖 | 转换 / 对比类 | `json-formatter`、`text-diff`、`base64-encode` |
| **T3** | 多面板 | 输入 + 选项 + 输出 | 3+ 参数       | `regex-tester`、`image-compress`、`loan`       |
| **T4** | 全屏   | 画布 + 悬浮工具栏  | 画布 / 拖拽   | `image-crop`、`pixel-art`、`map-editor`        |
| **T5** | 向导   | 步骤条 + 分步表单  | 多步骤产出    | `id-photo`、`invoice-gen`、`resume`            |
| **T6** | 仪表盘 | 多卡片网格         | 监控面板      | `seo-audit`、`api-test`                        |

### 选型判定顺序（从上到下，命中即停）

```text
1. 有画布 / 拖拽交互      → T4
2. 有多步骤产出物          → T5
3. 是多卡片监控面板        → T6
4. 有 3 个以上参数选项     → T3
5. 输入输出同构（转换/对比）→ T2
6. 其余                   → T1
```

> 870 个工具的 `template` 字段尚未回填。**不要在文档阶段手工逐条填**。
> 阶段 0 写 `scripts/check-tools.ts` 时同步实现一个规则推导器，
> 按 `tags` + `description` 关键词自动初判（含 `canvas`/`editor` → T4，含 `diff`/`convert` → T2 …），
> 再人工校准例外。预计 80% 可自动得出。

---

## 八、新增一个工具：完整流程

### 8.1 六步

```bash
# 1. 建目录（目录名 = slug）
mkdir -p apps/web/src/tools/json-formatter

# 2. 写 8 个文件（见 8.2）
# 3. 重新生成 catalog
pnpm generate:catalog

# 4. 本地验证
pnpm typecheck && pnpm test

# 5. 浏览器验证（自动路由已生效）
open http://localhost:5173/tools/json-formatter

# 6. 提交（CI 会跑全量门禁）
git add . && git commit -m "feat(tool): add json-formatter"
```

### 8.2 八文件清单

```text
src/tools/json-formatter/
├── meta.ts          元数据（必需）—— 见第六节
├── schema.ts        Zod 输入/输出校验（必需）
├── utils.ts         纯函数 transform(input, options) → output（必需）
├── Tool.tsx         按 meta.template 实现的 UI（必需）
├── test.ts          utils 单测（必需）
├── Tool.test.tsx    组件测试（必需）
├── e2e.spec.ts      Playwright E2E（必需）
└── README.md        用途/输入/输出/选项/限制/数据流向/示例（必需）
```

> `worker.ts` / `wasm.ts` 按需另加（B / C 类工具），不计入 8 文件基线。

### 8.3 各文件要点

**`schema.ts`** —— 类型用 `z.infer` 推导，不手写重复类型

```ts
import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(5_000_000),
})

export const optionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
  sortKeys: z.boolean().default(false),
})

export type Input = z.infer<typeof inputSchema>
export type Options = z.infer<typeof optionsSchema>
```

**`utils.ts`** —— 纯函数，不依赖 React、不碰 DOM、无副作用

```ts
import type { Input, Options } from './schema'

export function transform(input: Input, options: Options): string {
  // 必须处理三类输入：空值 / 超长 / 非法
  if (!input.text.trim()) return ''
  try {
    const parsed = JSON.parse(input.text)
    return JSON.stringify(parsed, options.sortKeys ? sortedReplacer : null, options.indent)
  } catch {
    return '' // 或抛出结构化错误，由 UI 展示
  }
}
```

**`Tool.tsx`** —— 只做 UI 组装，业务逻辑全在 `utils.ts`

```tsx
import { meta } from './meta'
import { transform } from './utils'

export default function Tool() {
  // 按 meta.template 选对应模板组件，不自己造布局
  return <TwoColumn meta={meta} onRun={transform} />
}
```

**必须的 `data-testid`**（E2E 与自动化校验依赖）：

```text
input / output / run / clear / copy / download / example
```

**`README.md`** 必须覆盖 7 项：用途 / 输入 / 输出 / 选项 / 限制 / 数据流向 / 示例。

### 8.4 分层约束（红线）

| 约束                                    | 说明                                       |
| --------------------------------------- | ------------------------------------------ |
| `utils.ts` 必须纯函数                   | 不依赖 React、不触碰 DOM、无副作用         |
| `Tool.tsx` 不写业务逻辑                 | 只组装，逻辑下沉 `utils.ts` 或 `features/` |
| `worker.ts` / `wasm.ts` 禁 import React | 执行层不依赖 UI                            |
| 工具之间禁止互相 import                 | 共用逻辑一律上提到 `features/` 或 `lib/`   |
| 不得绕过模板系统                        | 必须用 T1–T6 之一                          |

### 8.5 外部 API 配置（硬约束）

**任何需要调用外部 API 的工具或服务，都必须在 `.env`（不入库，故同步维护 [`.env.example`](../.env.example)）
中写清其 API 配置说明与配置方法。** 机检：`pnpm check:env`（已在 `pnpm verify` 与 CI 中，失败禁止合并）。

| #   | 条款                  | 说明                                                                                                   |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | 逐项登记              | 每个工具**逐项**列出所需配置项：变量名、用途、是否必填、获取途径（申请地址或控制台）、填写格式、示例值 |
| 2   | 中英混合服务名        | 服务名写成 `OpenAI（开放AI大模型服务）`、`GitHub（代码托管平台）` 这种形式，中英文读者都能识别         |
| 3   | 注释紧贴配置项        | 上述说明以注释形式**紧贴对应配置项**写入 `.env.example`，开发者仅凭该文件即可完成全部配置              |
| 4   | 严禁真实密钥入库      | `.env` 已在 `.gitignore` 中；`.env.example` 只放空值或 `xxx` 占位符，真实密钥提交即违规                |
| 5   | 新增即登记            | 新增/修改会调外部 API 的工具或服务时，同一次提交必须更新 `.env.example`，否则 `check:env` 失败         |
| 6   | 密钥禁止 `VITE_` 前缀 | Vite 会把 `VITE_` 开头的内联进浏览器产物；只有非密钥项（如默认端点、默认模型）可用该前缀               |

注释模板（新增配置项时照抄）：

```dotenv
# ── 变量：<NAME> ──────────────────────────
# 用途：<一句话说明这个变量控制什么>
# 必填：是 / 否（选「否」时必须写明缺省行为）
# 获取：<服务名（中文说明）> + 控制台地址
# 格式：<取值形态，含前缀与分隔符>
# 示例：<NAME>=<占位值，禁止真实密钥>
<NAME>=
```

写完变量字典后，还要在 `.env.example` 的「按工具逐项列出」段落补一段：

```text
工具：<slug>（中文名）
  需要：<VAR_A> / <VAR_B>
  说明：<哪个模式需要、不需要时怎么办>
```

---

## 九、开发命令速查

| 命令                    | 作用                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`              | 启动 `apps/web` 开发服务                                                                                               |
| `pnpm build`            | 全仓构建                                                                                                               |
| `pnpm build:ssg`        | 构建 + SSR 构建 + 预渲染（= CI 的完整产物）                                                                            |
| `pnpm test`             | Vitest 单测                                                                                                            |
| `pnpm test:e2e`         | Playwright E2E                                                                                                         |
| `pnpm lint`             | ESLint（全仓一份 flat config）                                                                                         |
| `pnpm lint:fix`         | ESLint 自动修可修的                                                                                                    |
| `pnpm format`           | Prettier 写入                                                                                                          |
| `pnpm format:check`     | Prettier 只检查（CI 跑这个）                                                                                           |
| `pnpm typecheck`        | `tsc --noEmit`                                                                                                         |
| `pnpm check:tools`      | 元数据完整性 + 重复检测 + 模板/大组校验                                                                                |
| `pnpm check:source-org` | 源码组织规范【强制约束】：一工具一文件夹、跨工具 import、命名（见 [`source-organization.md`](source-organization.md)） |
| `pnpm check:env`        | 外部 API 配置：`.env.example` 是否登记了每个需 API 的工具（§8.5）                                                      |
| `pnpm check:docs`       | 文档一致性（双语配对 / 结构 / 链接 / 术语）                                                                            |
| `pnpm verify`           | 以上 6 项门禁串跑（提交前跑这一个即可）                                                                                |
| `pnpm generate:catalog` | 扫描 `tools/*/meta.ts` 重建 catalog                                                                                    |
| `pnpm generate:sitemap` | 生成 `sitemap.xml`                                                                                                     |
| `pnpm build:wasm`       | 构建 / 拷贝 WASM 模块                                                                                                  |

> `typecheck` / `test` 走 pnpm 自带的递归运行器（`pnpm -r`），不经过 turbo —— 两者都是纯扇出，
> 不需要依赖图，而 turbo 在受限环境的 Windows 上会稳定触发 `os error 231`。
> `build` 与 `dev` 仍走 turbo（需要 `^build` 拓扑）；本地建议直接用 `pnpm build:ssg`，它不经过编排器。

---

## 十、质量门禁

### 10.1 单工具 DoD（全部满足才算完成）

```text
□ 8 个文件齐全（meta/schema/utils/Tool/test/Tool.test/e2e/README）
□ utils.ts 为纯函数
□ Tool.tsx 按 meta.template 实现
□ 所有交互元素有 data-testid
□ 单测覆盖率 ≥ 80%
□ 组件测试通过、E2E 通过
□ chunk < 30KB
□ 无 any、无 console.log
□ 移动端适配
□ 无障碍 0 critical / 0 serious
□ SEO 四件套：Title / Description / H1 / JSON-LD
□ FAQ ≥ 2 条
□ 相关工具内链 ≥ 3 个
□ README 七项齐全
```

### 10.2 全站 DoD

```text
□ 870 个工具全部通过单工具 DoD
□ pnpm lint / typecheck 0 error
□ pnpm test 全通过，覆盖率 ≥ 80%
□ pnpm build 成功
□ pnpm playwright test 全通过
□ 首屏 JS < 50KB；工具页 JS < 30KB
□ LCP < 2.5s / TBT < 200ms / CLS < 0.1
□ Lighthouse 首页 ≥ 95、工具页 ≥ 90
□ Docker 镜像可构建、可运行、可访问
□ sitemap.xml 含全部 870 个工具页；robots.txt 正确
□ PWA 离线可用
□ 线上可访问
```

### 10.3 CI 流水线（`.github/workflows/ci.yml`）

按序执行，**任一失败即停**：

```text
pnpm check:tools → pnpm check:docs → pnpm lint → pnpm format:check
                 → pnpm typecheck → pnpm test → pnpm build:ssg
```

本地等价命令是 `pnpm verify`（跑前 6 项；`build:ssg` 因为慢，单独跑）。
注意 CI 的 `push` 分支是 **master**（默认分支）与 main 两个，
改默认分支名时要同步改 `.github/workflows/ci.yml`，否则 push 触发的 CI 会静默不跑。

另有 `lighthouse.yml` 负责性能 / SEO / 无障碍检测。

### 10.4 工程配置与「已记录的例外」

| 文件               | 管什么                                             |
| ------------------ | -------------------------------------------------- |
| `.editorconfig`    | 编辑器实时行为（缩进 / 换行 / 编码），不参与构建   |
| `.prettierrc.json` | 格式的**唯一**决定方（无分号、单引号、100 列、LF） |
| `.prettierignore`  | 生成物、锁文件、二进制不参与格式化                 |
| `eslint.config.js` | 正确性与可访问性（flat config，全仓一份）          |
| `.gitattributes`   | 入库换行统一 LF；生成物标记为 `linguist-generated` |

分工原则：**Prettier 管格式，ESLint 管正确性，两者规则零重叠**，
所以不会出现两个工具互相推翻对方的情况。评审里也不要争论格式——跑一次 `pnpm format` 即可。

两处**刻意保留的规则豁免**，都在 `eslint.config.js` 里写了原因：

- `react-refresh/only-export-components` 对 `src/i18n/**` 与 `src/theme/**` 关闭：
  Context 的 Provider 与消费它的 hook 必须共享同一个 Context，拆文件只是多一层转发。
- `react-hooks/static-components` 对 `pages/ToolPage.tsx` 关闭：该页必须按 id 动态取组件
  （`import.meta.glob` 按需加载），规则无法跨函数识别「已按 id 缓存、身份稳定」。

生成物 `packages/catalog/src/tools.generated.ts` 同时被 Prettier 与 ESLint 忽略：
它是 `pnpm generate:catalog` 的产物，改它没有意义——要改就改各工具自己的 `meta.ts`。

### 10.5 八条红线（不可违反）

1. **不得手写路由表** —— 一律由 catalog 生成
2. **不得把 WASM 打进主包** —— 全部懒加载
3. **不得跳过输入校验** —— 所有输入必须过 Zod
4. **`api: true` 的工具不得隐藏数据流向** —— 页面须明示「需自备 API/Key」
5. **不得上传用户数据** —— 纯前端处理是本项目立身之本
6. **不得工具间互相 import** —— 共用逻辑上提
7. **不得绕过模板系统自造布局** —— 必须用 T1–T6 之一
8. **不得新增独立标签页 / 子类页** —— 一律走查询参数

---

## 十一、性能预算

| 指标      |        预算 | 策略                                                       |
| --------- | ----------: | ---------------------------------------------------------- |
| 首屏 JS   |      < 50KB | 首页只加载分类 + 热门 Top 20                               |
| 工具页 JS |      < 30KB | 每工具独立 chunk，按需加载                                 |
| 搜索索引  | < 50KB gzip | 构建时生成，只含 id/title/tags（+ description 需重估预算） |
| WASM      |    延迟加载 | 首次使用才下载，CacheFirst                                 |
| LCP       |      < 2.5s | 首页 Hero 静态渲染                                         |
| TBT       |     < 200ms | 重任务入 Worker                                            |
| CLS       |       < 0.1 | 预留工具区高度                                             |

**超预算时的处置**：chunk 超限 → 拆包 / 懒加载；LCP 慢 → 预加载 + 内联关键 CSS；
TBT 高 → Worker + 延迟执行；CLS 高 → 预留尺寸；图片大 → WebP/AVIF。

---

## 十二、SEO 要求（每个工具页）

```text
1. Title        ≤ 60 字符
2. Description  ≤ 160 字符
3. H1 + 正文     <h1>工具名</h1> + 一段说明
4. JSON-LD      三块：SoftwareApplication + FAQPage + BreadcrumbList
5. FAQ          2–4 条
6. 内链         3–5 个相关工具
```

生成文件：`sitemap.xml`（脚本生成）、`robots.txt`（静态）、`rss.xml`（可选）。

> ⚠️ Vite 是 SPA，默认 SEO 不友好。**阶段 0 必须补 SSG 预渲染方案**，
> 否则搜索引擎抓不到 870 个工具页的内容，SEO 目标直接落空。

---

## 十三、已拍板决策

|   # | 事项         | 决定                                               | 依据                                           |
| --: | ------------ | -------------------------------------------------- | ---------------------------------------------- |
|   1 | 框架         | **Vite**（非 Next.js）                             | 执行提示词 §四技术栈定稿                       |
|   2 | 工具粒度     | **870 个独立路由**（`/tools/:slug`）               | 执行提示词 §六 URL 规范                        |
|   3 | 4 组 ↔ 20 域 | **采用第五节真源表**                               | 该表脚本校验闭合（合计 870）                   |
|   4 | 执行宿主     | **Windows 原生**，不迁移 WSL2                      | 前端构建无需 Linux 环境                        |
|   5 | 批次规模     | **B2=662 / B3=59 / B4=79 / B5=58 / B6=12**         | 实测可行性分布，非旧估算值                     |
|   6 | i18n 范围    | **中英双语，客户端实时切换**（不再只「预留 key」） | 产品要求双语入口，见 §19                       |
|   7 | 主题         | **明 / 暗手动切换**，默认跟随系统                  | 产品要求深色模式，见 §19                       |
|   8 | 语言偏好落点 | **localStorage**，不引入 `/en` 路由前缀            | 需求是「实时切换 + 刷新保持」，非 SEO 多语言站 |

> 决策 6 取代了原先「中文单语起步」的口径：`MessageKey` 由中文真源推导，
> 英文包为 `Record<MessageKey, string>`，漏译即 typecheck 失败。

---

## 十四、待拍板事项（开工前请确认）

|     # | 事项                                | 建议                                                     | 阻塞   |
| ----: | ----------------------------------- | -------------------------------------------------------- | ------ |
| ~~A~~ | ~~i18n 范围：中文单语 vs 中英双语~~ | **已拍板（决策 6）：中英双语实时切换**                   | —      |
|     B | **「21 → 20」合并了哪个域**         | 差异已不可考，注明「以当前 20 域为准」后关闭             | 阶段 0 |
|     C | **WASM 分发**：自建 CDN vs 公共 CDN | 大模块（ffmpeg/vips/wllama）自建同源，小模块可走公共 CDN | 阶段 2 |
|     D | **D 类工具提示样式**（58 个）       | 顶部 Banner + 页内卡片（A+C 组合）                       | 阶段 2 |

---

## 十五、已知文档冲突（执行时以本文口径为准）

本文编写时核对出以下 spec 内部不一致，处置如下。**spec 原文尚未修订**，执行时按本节口径：

|   # | 位置                           | 冲突                                                                              | 本文采用                                                                                              |
| --: | ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
|   1 | `docs/审核报告.md` L4          | 引用路径 `.workbuddy/2026-09-23-17-52-10/docs/` 已不存在（目录已迁移至 `F:/max`） | 以当前实际路径为准                                                                                    |
|   2 | `spec/03` §3 工具目录规范      | 仍列 `worker.ts`/`wasm.ts` 进 8 文件基线                                          | 采用 `spec/09` 审计 #4：基线为 meta/schema/utils/Tool/test/Tool.test/e2e/README，worker/wasm 按需另加 |
|   3 | `spec/02` §7 待确认项          | 建议「多 Tab 合并」                                                               | 已与决策 #2（870 独立路由）冲突，**作废**                                                             |
|   4 | `spec/07-路线图.md` 开工前置表 | 列 8 项，未反映已拍板的 #1 / #3                                                   | 以 [`spec/08-待决事项.md`](spec/08-待决事项.md) 的决策记录为准                                        |
|   5 | `spec/05` 缺口清单             | `Mock API` 在「一、数据/开发」与「四、Web/生态」各计一次                          | 唯一模块应为 **66**，非 67                                                                            |
|   6 | `spec/09` §七批次规模          | 写 640/90/80/45/15                                                                | 采用实测 **662/59/79/58/12**                                                                          |

---

## 十六、排障速查

| 症状                          | 原因                                      | 处置                                                    |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| `pnpm install` 卡住 / 超时    | 未走代理或 registry 未换镜像              | 配 `PROXY` + npmmirror                                  |
| 新工具页面 404                | 未跑 `generate:catalog`，或 `id` ≠ 目录名 | 跑 `pnpm generate:catalog`；核对 id                     |
| `check:tools` 报 group 不匹配 | `category` 与 `group` 未按第五节表        | 查表纠正                                                |
| `check:tools` 报 deps 未声明  | `meta.deps` 里的包没装                    | 先 `pnpm add`，再写进 meta                              |
| chunk 超 30KB                 | 工具直接 import 了大库                    | 动态 import / 上提到 `features/` 共享 chunk             |
| WASM 加载失败                 | MIME 类型错误，或缺少 COOP/COEP 头        | 查 `vite.config.ts` 的 `assetsInclude` 与 Nginx `types` |
| 搜索搜不到新工具              | 索引未重建                                | 跑 `pnpm generate:catalog`（索引随 catalog 生成）       |
| E2E 选择器找不到              | 缺 `data-testid`                          | 补齐 7 个必需 testid                                    |

---

## 十七、建议的开工顺序

不要一上来就铺量 870 个工具。建议：

```text
阶段 0  骨架          Turborepo + Vite + packages/catalog + 路由生成 + 搜索索引 + CI
                     ↓ 验收：注册 1 个示例工具（json-formatter），T2 模板跑通，
                            4 组导航可用，Cmd+K 能搜到，CI 全绿
阶段 1  P0 148 个     纯前端高频，验证架构承载力
阶段 2  P1 322 个     补 WASM / 中等复杂度能力
阶段 3  P2 332 个     API 类，全部标注数据流向
阶段 4  P3 68 个 + PWA 收尾
```

**阶段 0 的验收是关键闸门**。骨架跑不通就铺量，会在 7000 个文件上放大同一个错误。

---

## 十八、阶段 0 实施现状（2026-09-23 建立，2026-09-24 增补部署）

### 18.1 已实现

```text
packages/catalog     20 域真源表 / 4 大组 / Zod 契约 / 路由生成 / 搜索索引
packages/search      检索门面（Orama 适配位预留）
apps/web             Vite 6 + React 19 + TS + Tailwind v4
                     路由由 catalog 生成（红线第 1 条已落地）
components           Header / SearchDialog(Cmd+K) / ToolShell / ToolCard
                     layout/{ThemeToggle,LanguageSwitch,Footer} / ui/icons
templates            T2 双栏（T1、T3–T6 待建）
i18n/                messages.zh(真源) / messages.en / catalog-text / Provider（见 §19）
theme/               明暗主题 Provider（见 §19）
lib/                 prefs（落盘 key）/ useIsomorphicLayoutEffect / useDocumentTitle
tools/               json-formatter（#131，8 文件齐全）
scripts/             generate-catalog / check-tools / generate-sitemap / prerender
apps/web/src/        entry-server.tsx（SSG 预渲染入口）
deploy/docker/       Dockerfile（多阶段，含 SSG）+ docker-compose.dev.yml
deploy/nginx/        default.conf（SPA fallback + gzip + 缓存 + WASM MIME）
deploy/binary/       二进制部署：build-bundle.sh / toolboxctl / install.sh / tests
                     （第三条链路，见 §20；四场景真机验证）
apps/web/public/     sitemap.xml / robots.txt
.github/workflows/   ci.yml（含 SSG 步骤）
```

### 18.2 实测门禁结果

| 门禁               | 结果                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:tools` | ✅ 20 域合计 870；dev 360 / design 200 / office 60 / life 250                                                                                               |
| `pnpm typecheck`   | ✅ catalog / search / web 三包 0 error                                                                                                                      |
| `pnpm test`        | ✅ **31 passed**（json-formatter 8+7、首页 7、偏好控件 9）                                                                                                  |
| `pnpm build`       | ✅ 工具 chunk **5.08KB**（gzip 2.08KB）< 30KB 预算；`app-core` 23.45KB（gzip 9.10KB）                                                                       |
| 路由冒烟           | ✅ `/`、`/tools`、`/c/dev`、`/c/dev/data-format`、`/tools/json-formatter` 全部 200                                                                          |
| `generate:catalog` | ✅ 扫描 `tools/*/meta.ts` 重建注册表，重跑校验仍通过                                                                                                        |
| Docker 镜像        | ✅ `toolbox-web:dev` 构建成功并运行，容器内 7 条路由全 200，healthcheck `healthy`                                                                           |
| Nginx 响应头       | ✅ html `text/html; charset=utf-8`；JS `Content-Encoding: gzip` + `max-age=31536000, immutable`；`.wasm` → `application/wasm`                               |
| **SSG 预渲染**     | ✅ 101 个静态页 + `404.html`；工具页 HTML 含真实 DOM（`data-testid="input"`），**无** Suspense fallback；title / description / canonical / JSON-LD 均已注入 |
| **双语切换**       | ✅ 默认中文；切英文后首页 / 导航 / 页脚 / 工具页文案与 `<html lang>`、`document.title` 同步更新；写入 `localStorage`，刷新保持                              |
| **明暗主题**       | ✅ 切换后 `<html class="dark">` 生效，写入 `localStorage`；首帧由内联脚本应用，无闪动                                                                       |

### 18.3 环境坑（Windows 原生执行必读）

| 现象                                 | 原因                                            | 解法                                                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_IGNORED_BUILDS`            | pnpm 10+ 默认不执行构建脚本                     | 在 `pnpm-workspace.yaml` 写 `allowBuilds: esbuild: true`（**不是** `package.json` 的 `pnpm` 字段，v12 已不再读取）                                                      |
| esbuild postinstall `EBUSY`          | 沙箱限制 spawn，`--version` 校验失败            | `pnpm install --ignore-scripts`；二进制来自 `@esbuild/win32-x64` 平台包，postinstall 仅为校验                                                                           |
| turbo `os error 231`（管道范例耗尽） | 并发 spawn 超出沙箱管道上限，Windows 上稳定复现 | `typecheck` / `test` 已改为走 `pnpm -r`；`build` / `dev` 仍用 turbo，本地请改用 `pnpm build:ssg`，或按包执行 `pnpm exec tsc -p <pkg>/tsconfig.json --noEmit` 绕开编排器 |

**Docker 构建期另有三个坑（已写进 `deploy/docker/Dockerfile`）：**

| 现象                                                 | 原因                                                                                            | 解法                                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base name (${NGINX_IMAGE}) should not be blank`     | ARG 写在 stage 内部，是 stage 作用域，第二个 `FROM` 看不见                                      | 两个 `ARG` 都必须声明在**第一个 `FROM` 之前**                                                                                                     |
| `Could not reach registry.npmjs.org/@pnpm/exe...`    | corepack 下载 pnpm 二进制默认走 npmjs                                                           | Dockerfile 内设 `COREPACK_NPM_REGISTRY`（默认 npmmirror）；构建代理变量要**大小写各传一份**，corepack/undici 只读小写                             |
| 首页返回 `application/octet-stream`，gzip 静默失效   | nginx 的 `types { }` 块在 server 级会**覆盖** http 级继承的整张 MIME 表                         | 删掉 server 级 `types { }`，直接继承 `/etc/nginx/mime.types`（nginx 1.21+ 已内置 `application/wasm`）。另注意 `include` 不能写在 `types { }` 内部 |
| `/tools` 返回 **301** → `/tools/`，与 canonical 冲突 | `try_files $uri $uri/` 里的 `$uri/` 会触发 index 模块的「目录自动补斜杠」                       | 改用 `try_files $uri $uri/index.html`，不写 `$uri/`                                                                                               |
| 拼错的 URL 返回 **200 + 首页内容**（软 404）         | 兜底写成 `/index.html` 时，所有未匹配路径都会被静默替换成首页；SSG 产出的 `404.html` 从未被使用 | `try_files $uri $uri/index.html **=404**;` + `error_page 404 /404.html;` + `location = /404.html { internal; }`，让未知路径真的返回 404 状态码    |

> Docker Hub 直连在部分网络下会被拦截。基础镜像可用 `--build-arg
NODE_IMAGE=docker.m.daocloud.io/library/node:24-alpine` 切国内加速源，
> Dockerfile 默认值保持官方源（CI 用）。

**SSG 期两个坑：**

| 现象                                                                      | 原因                                                                                                           | 解法                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot destructure property 'basename' of useContext(...) as it is null` | `pnpm add react-router` 装成了 **8.x**，与 `react-router-dom` 内置的 7.x 形成两份实例，Router context 互不相通 | 两者都留在 **7.x 且解析到同一版本**（当前 `react-router@^7.18.4` / `react-router-dom@^7.1.1`，均为 7.18.4）。`react-router` 已有 8.x，但 **`react-router-dom` 至今没有 8.x**，单独升前者必然双实例 |
| 预渲染产物全是「加载中…」                                                 | `router.tsx` / `ToolPage` 用了 `React.lazy`，`renderToString` 只输出 Suspense fallback                         | 必须用 React 19 的 `prerender`（`react-dom/static`），它会等待 Suspense 解析                                                                                                                       |

**构建分块坑（新增，870 铺量前务必理解）：**

| 现象                                                                    | 原因                                                                                                                                                                                 | 解法                                                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 入口 chunk 反向静态 import 某个**工具 chunk**，首屏被迫加载整包工具代码 | `manualChunks` 只为工具模块命名、其余返回 `undefined` 时，rollup 会把「被多处共享但未命名」的模块（如 i18n）塞进**首个被命名的 chunk**（即 `tool-json-formatter`），入口反过来依赖它 | 共享基础设施必须**显式命名**：`/src/(i18n\|theme\|lib)/` → `app-core`（且排除 `node_modules` 以免误命中依赖内部目录）。校验方法：检查入口 chunk 的静态 import 里不出现 `tool-` |

> 该坑在只有 1 个工具时表现为「工具 chunk 13.6KB → 5.1KB、入口多背 23KB」；
> 若不修，870 个工具铺开后共享代码会持续堆积在**随机某个工具 chunk**里，
> 使「工具页 < 30KB」这条预算彻底失真。

### 18.4 未实现（后续补齐）

| 项                     | 说明                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| ESLint                 | `pnpm lint` 尚未接入（CI 中该步骤已注释占位）                            |
| Orama 正式接入         | 当前为轻量子串匹配；中文分词需 `@orama/tokenizers/mandarin`              |
| 拼音 / 别名搜索        | 需 `pinyin-pro`，文档 §6 有此要求                                        |
| shadcn/ui              | 现为自建轻量组件                                                         |
| T1 / T3–T6 模板        | 仅实现 T2                                                                |
| PWA / Worker / WASM    | 阶段 2 及以后                                                            |
| 工具元数据的英文文案   | 仅 json-formatter 填了 `titleEn` / `descriptionEn`；其余工具缺省回落中文 |
| `/en` 路由与英文静态页 | 静态产物固定中文口径（SEO 主市场），英文仅在客户端生效                   |

### 18.5 指标冲突（新增，需拍板）

**首屏 JS 预算 < 50KB 与 React 19 技术栈冲突。**

实测首屏 chunk **262KB（gzip 84KB）**；加入双语与主题后为
**入口 267.8KB（gzip 85.5KB）+ app-core 23.5KB（gzip 9.1KB）≈ gzip 94.6KB**。
已做优化（zod 移出首屏路径 −61KB、页面级路由懒加载、页面与偏好控件分块）后仍超标约 89%。
基线构成：React 19 + react-dom ≈ 140KB（gzip ~45KB）、React Router ≈ 30KB（gzip ~10KB）、
双语文案 ≈ 20KB（gzip ~9KB）——**仅框架即在 55KB gzip 以上，恒定超出预算**。

三个出路，需选一个：

1. **放宽预算**至 gzip < 120KB（务实，推荐）
2. **换运行时**：Preact/compat 替代 React（约 −100KB，但偏离技术栈定稿）
3. **改架构**：SSG 预渲染 + islands 架构（工作量大，但兼得 SEO 与体积）

> 建议 **1**。理由：本项目是工具站，用户价值在工具本身而非首屏字节数；
> 且 SPA 首屏 JS 天然包含框架，50KB 预算在 React 19 下不可达，硬守只会逼出伪优化。

---

## 十九、双语与主题（2026-09-24 新增）

### 19.1 需求与落点

| 需求                   | 实现                                                |
| ---------------------- | --------------------------------------------------- |
| 中文 / 英文实时切换    | `src/i18n/` 自建轻量 i18n，切换即重渲染，无页面跳转 |
| 切换后所有可见文案更新 | 全站文案（含组名、域名、可行性标签）统一走 i18n key |
| 明 / 暗主题切换        | `src/theme/` + Tailwind v4 `@custom-variant dark`   |
| 偏好刷新后保持         | `localStorage`：`toolbox.locale` / `toolbox.theme`  |

两个控件都在 `Header` 右簇（`SearchDialog` 之后），共用
`components/layout/controls.ts` 的外观常量：同高 `h-8`、同圆角、同边框色。
移动端：搜索按钮收成图标、语言控件为 `中 | EN` 分段、主题为方形图标按钮，
三者始终留在顶栏（不藏进折叠菜单），整行在 360px 宽度下仍可容纳。

### 19.2 文案 key 的类型安全

```
messages.zh.ts   → export const zh = {...} satisfies Record<string,string>
                   export type MessageKey = keyof typeof zh   ← 唯一真源
messages.en.ts   → export const en: Record<MessageKey, string>
```

- **漏译即编译失败**：英文包少一个 key，`tsc --noEmit` 直接报错。
- **动态 key 仍受检**：`t(`group.${id}.name`)` 由模板字面量类型推导出 4 个具体 key，
  写错前缀会在类型层暴露。
- **插值**：`t('featured.stage', { live, planned, percent })`，占位符为 `{name}`。

### 19.3 首帧不闪动的做法（关键）

| 偏好 | 机制                                                                                                                                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主题 | 只是 `<html>` 上的类，**index.html 的内联脚本在首次绘制前写好**，React 不参与首帧；图标用 `dark:hidden` / `hidden dark:block` 由 CSS 二选一，避免「状态与主题不同步」的窗口期                                                                 |
| 语言 | 首渲染固定用默认中文（与 SSG 产物一致），`useIsomorphicLayoutEffect` 在**绘制前**同步已存偏好；若记住的语言非中文，内联脚本先挂 `html.i18n-pending` 遮住预渲染内容，Provider 就绪后摘除（另有 3s 兜底定时器，防止脚本异常导致内容永久不可见） |

> `useIsomorphicLayoutEffect`（`src/lib/`）：客户端用 `useLayoutEffect`，
> 服务端回落 `useEffect`，避免 SSG 期打印「does nothing on the server」告警。

### 19.4 数据类文案的处理

| 类型                                        | 做法                                                              | 原因                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 组名 / 域名 / 可行性标签（29 条，有限枚举） | 放 i18n 层 `group.*` / `category.*` / `feasibility.*`             | 集中一处，catalog 保持纯数据                                             |
| 工具标题 / 描述（逐条内容）                 | `ToolMeta` 新增**可选** `titleEn` / `descriptionEn`，缺省回落中文 | 逐条内容属于各工具自己的 `meta.ts`；可选设计使既有工具无需改动即通过校验 |
| 搜索索引                                    | 索引仍由中文 meta 构建，**展示时**按当前语言取词                  | 索引是构建期单一产物，不适合按语言复制                                   |

> `titleEn` / `descriptionEn` **不计入 §6 的 16 个必需字段**，
> `toolMetaSchema` 中为 `.optional()`，`check-tools` 行为不变。

### 19.5 新增/修改工具时的注意事项

1. 组件里**不要**写死中文文案，一律 `useTranslate()` 取词；区块内的常量数组
   （如 `Highlights` 的 `HIGHLIGHTS`）要移进组件体，否则切换语言后仍是旧文案。
2. 需要自定义分组文案时，先在 `messages.zh.ts` 加 key，`messages.en.ts` 会因
   `Record<MessageKey, string>` 立即报缺译。
3. **纯 CSS 判定的状态不要改成 React 条件渲染**（如主题图标），
   否则会重新引入首帧不一致的可能。
4. 改 `src/i18n/` `src/theme/` `src/lib/` 下的模块后，确认
   `vite.config.ts` 的 `manualChunks` 仍把它们划入 `app-core`（见 §18.3 分块坑）。

---

## 二十、部署与发布（三条链路）

### 20.1 选哪条

| 链路           | 位置                  | 目标机需要                       | 适用                                 |
| -------------- | --------------------- | -------------------------------- | ------------------------------------ |
| 源码部署       | 仓库根 `package.json` | Node ≥ 22.22 / pnpm / 源码       | 开发、CI                             |
| 容器部署       | `deploy/docker/`      | Docker                           | 自托管、横向扩展                     |
| **二进制部署** | `deploy/binary/`      | `sh` + `tar` + `systemd` + nginx | 单机上线、内网服务器、无 Docker 环境 |

三者的**产物内容完全一致**（都是 `apps/web/dist` 的纯静态文件），差别只在交付与运维方式。

### 20.2 二进制部署：只需记三条

```bash
# 安装（目标机需 root）
curl -fsSL <发布源>/install.sh | sudo bash -s -- --source <发布源>

# 查看
toolboxctl status && toolboxctl health

# 升级 / 回滚 / 卸载（升级源默认为本仓库 Release，可省略 --source）
toolboxctl upgrade
toolboxctl rollback
toolboxctl uninstall --purge
```

> ✅ 仓库已公开，升级源默认值
> `https://github.com/zhang123999-qq/toolbox/releases/latest/download`
> 匿名可访问（已实测 200）。离线环境改用自建 / 内网发布源：
> `toolboxctl upgrade --source <发布源基址>`。

### 20.3 目录布局与回滚

```text
/opt/toolbox/
├── releases/<ver>/     不可变：解包即用，升级只新增目录
├── current -> …        唯一切换点（软链，原子替换）
├── shared/             跨版本保留：渲染后的 nginx.conf / unit / state
├── logs/  run/         nginx 日志与 pid
├── /etc/toolbox/toolbox.conf   运行配置（PREFIX / PORT / 升级源）
└── /usr/local/bin/toolboxctl   全局 CLI（软链到 current/bin）
```

升级 = 解包到新目录 + 原子切软链；配置语法或健康检查不通过即自动切回旧目录。
CLI 运行的是**独立 nginx 实例**（自带 pid / 日志 / 临时目录 / MIME 表），只借用系统 nginx
**二进制**、不读 `/etc/nginx`，因此 `stop` 只停本站点、卸载不影响同机其它站点。

### 20.4 发布新版本

`deploy/binary/VERSION`（版本真源）→ `deploy/binary/build-bundle.sh` →
`git tag vX.Y.Z` → `gh release create`（附件即产物）。
一键安装入口固定指向 **Release 资产的 `install.sh`**（与 tag 绑定，不随分支漂移）。
版本号的五个落点与 changelog 撰写要点见 [`RELEASE.md`](RELEASE.md) §一 / §三。

### 20.5 相关文档

| 我要…                               | 看                                                         |
| ----------------------------------- | ---------------------------------------------------------- |
| 一行命令把站点装起来                | 仓库根 [`README.md`](../README.md)「快速开始」· 本文 §20.2 |
| 四类场景的完整操作手册              | [`../deploy/binary/README.md`](../deploy/binary/README.md) |
| 打包、打 tag、发 Release、changelog | [`RELEASE.md`](RELEASE.md)                                 |
| 容器部署细节与 nginx 坑             | 本文 §18.3                                                 |

## 二十一、容器化全量测试（可复现）

`pnpm verify` 跑的是「本机口径」；同一套检查在容器里再跑一遍，才能排除
「Node 版本 / 系统库 / 换行 / 权限」带来的差异。容器化测试不是替代，是**第二口径**。

### 21.1 两条命令

```bash
# 构建（web = 部署链路的 nginx 镜像，test = 测试镜像，含 chromium + nginx）
docker compose -f deploy/docker/docker-compose.test.yml build

# 跑全量：门禁 → 单测 → 构建 → bundle → 真起 nginx → E2E → 产物冒烟
ROUND=round1 docker compose -f deploy/docker/docker-compose.test.yml run --rm test
```

逐阶段日志落在 `.agent/test-logs/$ROUND/*.log` + `summary.tsv`（卷挂载，容器删除不丢）；
退出码非 0 = 有阶段失败。

### 21.2 覆盖的阶段

| 阶段                            | 内容                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| `deps`                          | `pnpm install --frozen-lockfile`，锁文件不一致即失败            |
| `gate-*`                        | check:tools / source-org / env / docs / licenses / 部署脚本机检 |
| `lint` `format` `typecheck`     | 与 CI 同一份配置                                                |
| `unit`                          | vitest（单测 + 组件测试）                                       |
| `build-ssg`                     | 客户端 → SSR → 预渲染，顺序不能反                               |
| `bundle` + `deploy-nginx`       | 打 bundle 并**真起一个 nginx** 验证路由 / 404 / gzip / 健康检查 |
| `e2e`                           | Playwright 真实浏览器跑核心业务流程                             |
| `smoke-preview` / `smoke-nginx` | HTTP 级冒烟（preview 走 SPA 回退语义，nginx 走硬 404 语义）     |

### 21.3 改这些文件时要注意的坑

1. **`COPY . .` 必须排在 chromium / nginx 之后**：这两个层各要十几分钟，
   源码先拷进去的话，每改一行代码都会作废它们。
2. **compose 不要透传宿主机 `HTTP_PROXY`**：它通常指向 `127.0.0.1`，
   在容器里那是容器自己，结果是所有请求 `Connection refused`。
   需要代理就显式 `export DOCKER_BUILD_HTTP_PROXY=http://host.docker.internal:<port>`。
3. **healthcheck 的 exec 数组形式不做 shell 解析**，`">/dev/null"` 会被当成第三个 URL
   传给 `wget`，容器永远 unhealthy。要么 `CMD-SHELL`，要么别写重定向。
4. **Git Bash 下 `docker run` 要 `export MSYS_NO_PATHCONV=1`**，否则
   `-e LOG_DIR=/app/...` 会被转成 Windows 路径，日志写不进挂载卷。

## 二十二、二进制与 Docker 部署验证规范

单元与 E2E 测试跑的是「代码对不对」；部署验证跑的是「装上去能不能用」。
后者只能在**真实目标机**上做——权限、属主、systemd、端口、日志落盘这些
问题，在容器里跑单测永远暴露不出来。

本规范是**每次发二进制或 Docker 制品前默认要跑的一套**，脚本已固化在
`deploy/docker/verify-*.sh`，可反复执行（幂等），逐条输出用例编号、输入、
预期、实际与退出码。

### 22.1 验证环境（默认参数）

| 项              | 值                                                                 |
| --------------- | ------------------------------------------------------------------ |
| 目标机          | `root@192.168.100.4`（Ubuntu 24.04 / nginx 1.24 / docker 29.7）    |
| 联网代理        | `http://192.168.200.4:10810`（仅下载环节需要）                     |
| 二进制部署端口  | `8081`（systemd 托管，就是产品默认端口）                           |
| Docker 部署端口 | 容器内 `8081`、宿主 `8082`（**故意错开**，好与二进制部署同机串跑） |
| 日志与报告      | 目标机 `/tmp/tbv/*-result.log`                                     |

### 22.2 三步执行

```bash
# 0) 造制品（在容器内，保证与 CI 同环境）
docker run --rm -v "$PWD/dist-release:/out" toolbox-test:dev \
  bash -c 'cd /app && pnpm build:ssg && bash deploy/binary/build-bundle.sh --out /out'

# 1) 传到目标机（注意：scp -r 时目标目录若已存在会嵌套，先 rm -rf）
ssh root@192.168.100.4 'rm -rf /tmp/tbv/dist-release'
scp -r dist-release deploy/binary/toolboxctl deploy/docker/verify-*.sh root@192.168.100.4:/tmp/tbv/

# 2) A 组：二进制本地运行验证（CLI 行为，不需要已安装实例）
ssh root@192.168.100.4 'bash /tmp/tbv/verify-binary-local.sh'

# 3) B 组：二进制真实部署（幂等：已装则先 uninstall --purge 再装到 8081）
ssh root@192.168.100.4 'bash /tmp/tbv/verify-binary-deploy.sh'

# 4) C 组：Docker 真实部署（镜像 docker save → scp → load → run，容器 8081 / 宿主 8082）
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .
docker save toolbox-web:dev -o .agent/tmp/web-image.tar
scp .agent/tmp/web-image.tar root@192.168.100.4:/tmp/tbv/web-image.tar
ssh root@192.168.100.4 'docker load -i /tmp/tbv/web-image.tar && bash /tmp/tbv/verify-docker-deploy.sh'
```

### 22.3 覆盖面

| 组  | 用例数 | 覆盖                                                                                                                                                                                                                                                                                                         |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | 28     | 可执行性与解释器、usage/version、未知命令、非法 `--port`/`--from`/`--prefix`、非 root 拒绝、模板渲染与 `nginx -t`、**默认端口 8081 与 `TOOLBOX_PORT` 覆盖**、nobody 降级组名、产物权限与校验和                                                                                                               |
| B   | 35     | 发布源下载→sha256 校验→解包→落地→渲染→systemd 全流程；**dry-run 默认端口与环境变量覆盖**；目录结构、权限属主、worker 可读（403 回归）、master/worker 进程身份、端口、运行时依赖、`/healthz`、真 404、sitemap、gzip、日志落盘与属主、status/config/list/doctor、restart/reload/stop/start、配置文件与命令入口 |
| C   | 23     | 镜像 load、容器 run、HEALTHCHECK healthy、端口映射、**容器内监听 8081**、容器内权限与 worker 身份、`/healthz`、真 404、gzip、`docker logs` 落盘、挂载卷落盘、端口冲突异常、stop 与端口释放                                                                                                                   |

### 22.4 通过标准

1. 三组**全部用例 PASS**，退出码 0；失败必须定位根因后修产品代码，
   **不允许**改断言去迁就、不允许跳过或注释用例。
2. 修完必须**重建制品**（bundle / 镜像）并重跑相关组做回归，
   只改源码不重造制品等于没验。
3. 收尾确认：默认端口（8081）服务 active+enabled、无残留容器、临时端口已释放。

### 22.5 已知坑（照着做能省一半时间）

1. **`--prefix` 不是多实例开关**。全局配置 `/etc/toolbox/toolbox.conf` 与
   systemd unit 名 `toolbox.service` 都是**单例**的：用 `--prefix /tmp/x`
   装一次，之后所有不带 `--prefix` 的命令（含 `uninstall`）都会打向
   `/tmp/x`。曾因此想卸载生产却卸掉了演练实例。`--prefix` 只用于临时演练，
   用完立刻装回 `/opt/toolbox`。
2. **运维子命令曾静默忽略 `--prefix`**（`status`/`stop`/`config`/`list` 等根本不解析参数），
   `toolboxctl stop --prefix /tmp/x` 会直接停掉默认实例——在目标机上真实停过一次生产服务。
   现在由 `main()` 统一预解析并对多余参数报错，改这些函数时别把校验删掉。
3. **两种部署形态默认端口相同（都是 8081），同机必须错开**。二进制部署默认占 8081，
   Docker 容器内也监听 8081，所以同一台机器上要么串行跑、要么改宿主映射
   （`-p 8082:8081`）。验证脚本就是这么做的：B 组用产品默认 8081，
   C 组固定映射到 8082。
4. **给容器挂 `/var/log/nginx` 会让 `docker logs` 变空**：官方镜像把
   `access.log` 软链到 `/dev/stdout`，挂上宿主机目录后软链被真实目录取代。
   两条日志路径（stdout / 文件）要用**不同容器**分别断言。
5. **Git Bash 下 `docker save -o /tmp/x.tar` 后 `scp /tmp/x.tar` 找不到文件**：
   Windows 版 scp 不认 Git Bash 的 `/tmp` 映射。把制品写到项目内相对路径（如 `.agent/tmp/`）。
6. **`scp -r` 到已存在的目录会产生嵌套**（`dist-release/dist-release`），先 `rm -rf`。
7. **在容器里跑打包脚本，用的是镜像内的旧脚本**：改完 `build-bundle.sh`
   必须先重建 `toolbox-test:dev`，否则验证的是旧逻辑。
8. **发布源用本机 `python3 -m http.server` 托管 `dist-release/`** 即可覆盖
   「下载 + 校验」环节，不必动公开 Release，也不依赖外网。
