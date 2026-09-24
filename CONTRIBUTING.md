# 贡献指南

> **中文** | [English](CONTRIBUTING.en.md)
> 本文说明**怎么改这个项目**：环境、约定、流程、门禁。项目是什么、怎么部署，
> 请看 [`README.md`](README.md) 与 [`docs/guide/`](docs/guide/README.md)。

---

## 一、先读这三份

| 文档                                                         | 为什么先读                                             |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)                 | 开发手册：catalog 机制、元数据契约、模板选型、八条红线 |
| [`docs/guide/configuration.md`](docs/guide/configuration.md) | 配置分三层，改错层会出现「改了没生效」                 |
| [`docs/glossary.md`](docs/glossary.md)                       | 术语真源；写英文文档时它决定你用哪个词                 |

---

## 二、本地环境

### 2.1 环境要求

Node ≥ 22.22、pnpm ≥ 9。不需要 Docker、不需要 Go、不需要 WSL。浏览器自动化用系统已装的
Edge 即可，不必额外下载 Chromium。

### 2.2 首次安装

```bash
git clone https://github.com/zhang123999-qq/toolbox.git
cd toolbox
pnpm install --ignore-scripts   # esbuild 的 postinstall 在部分 Windows 环境会 EBUSY
pnpm verify                     # 跑一遍门禁，确认基线是绿的
pnpm dev                        # 开发服务器
```

---

## 三、目录与命名约定

### 3.1 目录结构

| 目录                             | 职责                                   | 不要放什么           |
| -------------------------------- | -------------------------------------- | -------------------- |
| `packages/catalog`               | 20 域 ↔ 4 大组真源、Zod 契约、路由派生 | 任何 UI              |
| `packages/search`                | 检索门面（Orama 适配位）               | 与检索无关的工具函数 |
| `apps/web/src/tools/<slug>/`     | 单个工具的 8 个文件                    | 跨工具复用的逻辑     |
| `apps/web/src/components/`       | 布局、工具壳、模板、通用件             | 业务逻辑             |
| `apps/web/src/{i18n,theme,lib}/` | 文案、主题、跨切面小工具               | 任何硬编码文案       |
| `scripts/`                       | 构建期脚本（生成 / 校验 / 预渲染）     | 运行时代码           |
| `deploy/`                        | 容器与二进制两条部署链路               | 前端源码             |

### 3.2 命名约定

| 对象           | 约定                                        | 例子                                                                   |
| -------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| 工具 slug      | 小写 + 中划线 + 语义化，**不与 npm 包重名** | `json-formatter`（不是 `jsonFormatter` / `json_formatter` / `base64`） |
| React 组件文件 | PascalCase                                  | `ToolShell.tsx`                                                        |
| 非组件模块     | kebab-case 或 camelCase（同类保持一致）     | `catalog-text.ts`、`useDocumentTitle.ts`                               |
| 文档文件       | kebab-case 纯 ASCII；英文版加 `.en.md`      | `getting-started.md` / `getting-started.en.md`                         |
| 测试文件       | 工具内为 `test.ts` / `Tool.test.tsx`        | `src/tools/<slug>/test.ts`                                             |

---

## 四、代码规范

### 4.1 格式化与 lint

```bash
pnpm format        # Prettier 写入
pnpm format:check  # 只检查（CI 跑这个）
pnpm lint          # ESLint（flat config，全仓一份）
pnpm lint:fix      # 自动修可修的
```

格式由 Prettier 单方面决定，不要在评审里争论缩进与引号——`pnpm format` 跑一遍就没有分歧了。
ESLint 只管正确性与可访问性，不掺格式规则（避免两个工具互相打架）。

### 4.2 几条硬性约定

先看 [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) §10.4 的**八条红线**，其中五条在日常改动里最常遇到：

| 约定                  | 原因                                                     |
| --------------------- | -------------------------------------------------------- |
| 不手写路由表          | 路由由 catalog 派生，手写必然与真源漂移                  |
| 不跳过输入校验        | 所有外部输入过 Zod，错误信息要能定位到位置               |
| 不上传用户数据        | 本地优先是立身之本，任何「顺便上报」都不接受             |
| 工具之间不互相 import | 共用逻辑上提到 `features/` 或 `lib/`，否则耦合会指数增长 |
| 文案不写死            | 一律走 i18n key，漏译会让英文包编译失败                  |
| `utils.ts` 保持纯函数 | 不依赖 React、不碰 DOM、无副作用，否则无法单测           |

---

## 五、开发流程

### 5.1 新增一个工具

```bash
mkdir -p apps/web/src/tools/<slug>
# 建 8 个文件：meta / schema / utils / Tool.tsx / test / Tool.test.tsx / e2e.spec.ts / README.md
pnpm generate:catalog   # 重建注册表（改了 meta.ts 就必须跑，否则英文标题不生效）
pnpm check:tools        # 校验元数据契约
pnpm verify             # 全量门禁
pnpm dev                # 打开 /tools/<slug> 人工看一眼
```

模板从 T1–T6 里选一个，不要自造布局。D / E 类工具**必须在页面上明示数据流向**——
这是红线，不是建议。

### 5.2 修复一个问题

先加一个**会失败的测试**，再改代码让它通过。这个项目多数缺陷是「只有真机才暴露」的类型
（异步 reload、双实例依赖、分块归属），所以修完请补一条能复现的断言，
否则下次同样的问题还会回来。

---

## 六、提交信息约定

采用 Conventional Commits，首行 ≤ 72 字符，正文说**为什么**而不是**改了什么**：

```text
<type>(<scope>): <subject>

<body：动机、取舍、影响面>

<footer：关联 issue>
```

| type       | 用于             |
| ---------- | ---------------- |
| `feat`     | 新功能           |
| `fix`      | 缺陷修复         |
| `docs`     | 只改文档         |
| `refactor` | 不改行为的重构   |
| `test`     | 只改测试         |
| `chore`    | 构建、依赖、配置 |
| `ci`       | 流水线           |

**一个提交只做一件事**。修 bug 顺带重构、加功能顺带格式化，都会让 review 无法快速判断风险。

### 6.1 scope 取值

scope 写**改动的目录或子系统**，不写功能模块名：

| scope     | 范围                                   |
| --------- | -------------------------------------- |
| `catalog` | `packages/catalog`：真源表、契约、路由 |
| `web`     | `apps/web`：布局、组件、i18n、主题     |
| `tools`   | 单工具目录（可细到 `<slug>`）          |
| `deploy`  | 容器 / 二进制两条部署链路              |
| `docs`    | 文档                                   |
| `scripts` | 构建期脚本                             |
| `deps`    | 依赖增删与升级                         |

`ci` 类型的 scope 可省略。

### 6.2 破坏性变更

不兼容的改动在 type 后加 `!`，footer 用 `BREAKING CHANGE:` 说明 migrating 方式：

```text
feat(catalog)!: 元数据契约新增 titleEn 字段

BREAKING CHANGE: 已有 meta.ts 会被 check:tools 判为缺字段，
需重跑 pnpm generate:catalog 重新生成注册表。
```

### 6.3 提交模板

仓库提供 [`.gitmessage`](.gitmessage)，配置一次后每次 `git commit` 都会带出骨架：

```bash
git config commit.template .gitmessage
```

### 6.4 正反例

```text
✓ feat(tools): 新增 url-parser，拆解协议/主机/端口/查询参数
✓ fix(deploy): 无 systemd 时不再装到一半失败，降级为只落地
✓ docs(deploy): 一键安装脚本补充 --proxy 与 --mirror 用法
✗ update                    ← 没有 type，看不出性质
✗ feat: 加了个工具          ← 没说清加了什么、在哪
✗ fix bug + format          ← 一次提交做了两件事
```

---

## 七、提交前必须通过的门禁

```bash
pnpm verify
```

它按顺序跑：元数据校验 → 文档一致性 → 依赖许可校验 → ESLint → Prettier 检查 → 类型检查 →
单测。任一项失败都不要提交。CI 跑的是同一组命令，本地通过即代表远端通过。

| 门禁             | 拦的是哪类问题                                     |
| ---------------- | -------------------------------------------------- |
| `check:tools`    | 元数据缺字段、编号不连续、域合计不等于 870         |
| `check:docs`     | 双语缺一边、结构不对齐、断链、锚点失效、术语不统一 |
| `check:licenses` | 依赖里混进 GPL / AGPL / SSPL / BUSL 等受限许可     |
| `lint`           | 未使用变量、可访问性缺陷、hooks 规则               |
| `format:check`   | 格式漂移                                           |
| `typecheck`      | 三个包的类型错误                                   |
| `test`           | 行为回归                                           |

---

## 八、Pull Request 约定

1. **小步**：一个 PR 解决一个问题；跨目录的大改请拆成多个 PR。
2. **说清验证方式**：附上门禁输出，涉及 UI 的附截图，涉及部署的附目标机实测结果。
3. **不要顺手改无关文件**：格式化整仓、重排 import 这类改动请单独开 PR。
4. **文档同步**：改了行为就改文档；中英成对，`pnpm check:docs` 会检查。
5. **不要提交产物**：`dist/`、`dist-release/`、`tmp-shots/`、`verify.mjs` 已在 `.gitignore` 里。

---

## 九、文档贡献

| 规则          | 说明                                                             |
| ------------- | ---------------------------------------------------------------- |
| 中英成对      | `<name>.md` 与 `<name>.en.md` 同目录；顶部的语言切换链接必须双向 |
| 结构对齐      | 章节数与代码块数量两边一致（脚本会校验）                         |
| 术语统一      | 按 [`docs/glossary.md`](docs/glossary.md)；禁用译法会被机检拦下  |
| 新增即入索引  | 新文档必须出现在 [`docs/README.md`](docs/README.md) 的文档地图里 |
| 锚点用显式 id | 跨节引用优先 `<a id="x"></a>`，不依赖中文标题推导出的 slug       |
| 命令必须可跑  | 文档里的命令要能直接执行；给期望结果，不要只写「应该成功」       |

改完跑一次：

```bash
pnpm check:docs
```

---

## 十、第三方依赖与许可证

本项目是 MIT 许可，因此**依赖也必须是宽松许可**：MIT / ISC / Apache-2.0 / BSD / CC0 这一类。
GPL / AGPL / SSPL / BUSL 这类强传染或带商业限制的许可一律不引入。

| 规则         | 说明                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| 只用宽松许可 | 加依赖前先看它的 LICENSE 与 SPDX 字段；判定不了就别加                                  |
| 能不加就不加 | 870 个工具绝大多数是纯 JS 能算的，优先手写 utils，不让依赖膨胀                         |
| 校验进 CI    | `pnpm check:licenses` 扫描全部已安装包，命中受限许可直接失败                           |
| 例外要登记   | 确需弱 copyleft（如 MPL-2.0）的**构建期**依赖，写进脚本 `APPROVED_EXCEPTIONS` 并附理由 |
| 不装闭源组件 | 专有二进制、需授权才能分发的组件一律不用                                               |

单独跑：

```bash
pnpm check:licenses          # 受限许可报错，弱 copyleft 只提示
pnpm check:licenses --strict # 弱 copyleft 也报错
```
