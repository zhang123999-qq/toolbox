# 变更日志

本文件记录所有值得注意的变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)（`MAJOR.MINOR.PATCH`，
测试版带 `-beta` 等预发布后缀）。
每个版本对应一个 git tag（`vX.Y.Z`）与一个 GitHub Release，
Release 附件即该版本的可部署产物（见 [`docs/RELEASE.md`](docs/RELEASE.md)）。

## [0.0.1-beta] - 2026-09-25

首个对外测试版（beta）。本版合并了此前仅内部构建、未对外发布的 `0.0.1` 骨架版，
把「可部署的工程基座」推进到了「**可铺量的完整站点**」：

- **工具 75 / 870**：文本与内容域（01）全部 70 个交付完毕，含工程样例共 75 个，
  全部提供中英双语标题与描述
- **两条部署链路可用且可验证**：二进制（`toolboxctl` + 自包含 bundle）与容器
  （多阶段 Dockerfile），并配齐容器化全量测试与制品部署验证规范（四组 133 条用例）
- **三类强制约束**（均有机检脚本并纳入 CI）：源码组织、外部 API 配置、依赖许可
- 静态预渲染 102 个页面（含 `404.html`），默认安装端口统一为 **8081**

### 新增

**工程基座**

- pnpm + Turborepo 单体仓库，`packages/catalog` 作为 20 域 ↔ 4 大组唯一真源表
  （合计 870，脚本校验闭合），含 Zod 元数据契约与可行性→布尔字段强制映射
- 路由全部由 catalog 派生，新增工具只需建目录 + `meta.ts` 并执行
  `pnpm generate:catalog`（红线：禁止手写路由表）
- `scripts/`：目录生成、元数据校验、sitemap 生成、SSG 预渲染
- GitHub Actions 流水线：按门禁顺序串联校验 → 类型检查 → 测试 → 构建 → SSG

**站点与体验**

- Vite + React 19 + TypeScript + Tailwind v4，页面级懒加载
- SSG 预渲染：102 个静态页 + `404.html`，注入 title / description / canonical /
  JSON-LD，工具页对爬虫可见真实 DOM
- 首页 Landing Page：主视觉、核心亮点、4 大组、20 域速览、已上线工具、底部 CTA，
  全响应式（375px 无横向滚动）
- 中英双语实时切换：文案 key 类型安全（英文包为 `Record<MessageKey, string>`，
  漏译即编译失败），切换同步 `<html lang>` 与文档标题
- 明暗主题切换：首帧前由内联脚本应用，无闪动
- 语言与主题偏好落 `localStorage`，刷新与再次访问保持
- 全局搜索（⌘K / Ctrl+K）

**工具（75 个）**

- **文本与内容域（01）全部 70 个工具**：按 `docs/tools/01-文本与内容.md` 逐条实现，
  每个工具 8 文件基线（`meta` / `schema` / `utils` / `Tool` / `test` / `Tool.test` /
  `e2e` / `README`）；跨域共用逻辑上提到 `apps/web/src/lib/`（`text` / `diff` / `table` /
  `ai` / `zerowidth` / `pipeline`）；T2 / T3 模板相应补齐异步运行（D 类接口工具）、
  多段平级输入、多行文本选项与自定义占位文案
- `json-formatter`（#131，data-format/dev，P0，T2 模板）：格式化、压缩、校验、
  缩进与键排序
- 75 个工具**全部**提供 `titleEn` / `descriptionEn`，英文环境不再回落中文

**质量门禁与工程规范**

- **工程配置**：ESLint（flat config，含 React / hooks / 可访问性规则）、Prettier、
  EditorConfig、`.gitattributes`（换行统一 LF）；新增 `pnpm lint` / `format` / `format:check` /
  `check:docs` / `verify` 脚本，CI 增加静态检查门禁
- **双语文档体系**：`docs/guide/`（安装与快速上手 / 使用示例 / 配置说明 / 排障，四篇中英成对）、
  `docs/glossary.md`（术语真源 + 禁用译法）、`CONTRIBUTING.md`、`docs/README.en.md`
- **文档一致性校验**：`pnpm check:docs` 机检双语配对、结构对齐、链接与锚点、术语统一、
  在线地址与「尚未上线」标注、新文档是否已入索引
- **MIT 许可证**：新增 `LICENSE`；根与各 workspace 包的 `package.json` 补齐 `license` /
  `repository` / `bugs` / `homepage` 字段；两份 README 加许可徽标与许可证章节
- **依赖许可校验**：新增 `scripts/check-licenses.ts`（`pnpm check:licenses`），扫描全部已安装
  包的 SPDX 表达式（支持 `OR` / `AND` / `WITH`），GPL / AGPL / SSPL / BUSL 与未声明许可一律
  失败，已纳入 `pnpm verify` 与 CI；弱 copyleft 默认只提示，`--strict` 下才报错
- **提交规范与社区文件**：新增 `.gitmessage` 提交模板、`.github/PULL_REQUEST_TEMPLATE.md`、
  `.github/ISSUE_TEMPLATE`（缺陷 / 功能建议两类 + 选择器）；CONTRIBUTING（中英）补充
  scope 取值、破坏性变更写法、正反例，并新增「第三方依赖与许可证」一节

**三类强制约束**

- **源码组织规范**：新增 [`docs/source-organization.md`](docs/source-organization.md)
  （中英成对），明确「一工具一文件夹」：工具目录自包含 8 个文件、禁止跨工具 import、
  命名须 kebab-case 且与 catalog id 一致、禁止多工具混放；配套
  `scripts/check-source-org.ts`（`pnpm check:source-org`）机检目录 ↔ catalog 对应、
  标准文件集、跨工具 import、多工具混放、命名合规、公共层反向依赖六条规则
- **外部 API 配置硬约束**：新增 `docs/DEVELOPMENT.md` §8.5（中英同步）——任何调用外部 API
  的工具或服务，都必须在 `.env` / `.env.example` 写清变量字典（用途、是否必填、获取途径、
  格式、示例值），并按工具逐项列出所需配置；服务名统一中英混合写法
  （如 `OpenAI（开放AI大模型服务）`、`GitHub（代码托管平台）`）。
  新增 `.env.example`（登记 SITE_ORIGIN / GITHUB_TOKEN / TOOLBOX_REPO / TOOLBOX_PROXY /
  TOOLBOX_PORT / `VITE_TOOLBOX_AI_API_BASE` / `VITE_TOOLBOX_AI_MODEL` /
  `TOOLBOX_AI_API_KEY` 等，以及 5 个 D 类工具与三个服务的清单）；
  配套 `scripts/check-env-config.ts`（`pnpm check:env`）机检 `.env` 已被忽略、
  `.env.example` 已放行、每个 `api: true` 的工具都已登记、无疑似真实密钥、
  无 `VITE_` 前缀承载密钥
- **AI 助手自动提交与推送**：`CONTRIBUTING.md` 新增 §6.5（中英同步）——每完成一个原子性改动
  并通过相关门禁，必须立即提交并推送到当前远程分支，禁止累积多次改动后一次性提交；
  条款覆盖触发时机、执行动作（按路径暂存 + Conventional Commits + push）、提交范围
  （排除构建产物 / 依赖目录 / 日志 / 含敏感信息的文件）、失败处理（push 失败或冲突即中止
  并报告，禁止强推或跳过提交）、验证要求（提交后输出提交哈希并核对远端已同步）

**部署与发布**

- **容器部署**：多阶段 Dockerfile + 独立 nginx 配置（SPA 路由、gzip、长缓存、
  WASM MIME、真实 404）
- **二进制部署**（`deploy/binary/`）：自包含 bundle + `toolboxctl` 管理 CLI，
  覆盖安装 / 卸载 / 日常运维 / 在线升级四类场景；升级含整包与逐文件双重校验，
  健康检查失败自动回滚；使用**独立 nginx 实例**，不影响目标机其它站点
- **一键安装**：`deploy/binary/install.sh`，支持 `curl … | sudo bash` 单条命令安装
- **发布源统一**：一键安装入口与 `toolboxctl` 的 `check-update` / `upgrade` 默认发布源
  统一指向本仓库 Release 资产，机检脚本 `deploy/binary/tests/verify-release-source.sh`
  拦住脚本与文档之间的漂移

**测试与验证**

- **容器化全量测试环境**：`deploy/docker/Dockerfile.test` +
  `deploy/docker/docker-compose.test.yml` + `deploy/docker/run-tests.sh`。
  一次 build 固化 Node 24 / pnpm / 依赖 / chromium / nginx，再按阶段跑
  门禁 → 单测 → 构建 → 打 bundle → 真起 nginx → E2E → 产物冒烟，
  逐阶段日志落 `.agent/test-logs/<轮次>/`（卷挂载）
- **二进制部署链路的自动化验证**：容器化的 `deploy-nginx` 阶段把 bundle 解包、
  渲染 nginx 配置、真起一个 nginx，再断言路由 / 404 / gzip / 健康检查（32 项）
- **制品部署验证规范**（`docs/DEVELOPMENT.md` §二十二，中英双语）：四组共 133 条用例，
  脚本固化在 `deploy/docker/verify-binary-local.sh`（A 组 28 条，CLI 行为）、
  `verify-binary-deploy.sh`（B 组 35 条，二进制真实部署）、`verify-docker-deploy.sh`
  （C 组 23 条，Docker 真实部署）、`verify-binary-cli.sh`（**D 组 47 条，运维命令行**：
  `help`/`version`/`status`/`config`/`list`/`doctor`/`health`/`logs`/`backup`/`render`/
  `install`/`uninstall`/`start`/`stop`/`restart`/`reload`/`check-update`/`upgrade`/`rollback`
  与 `install.sh`，含经代理的完整链路与升级→回滚闭环）。幂等可重跑，
  逐条输出编号 / 输入 / 预期 / 实际 / 退出码

### 变更

- **默认安装端口由 `80` 改为 `8081`**（**破坏性变更**，但**只影响新安装**：已装实例的端口
  记在 `/etc/toolbox/toolbox.conf`，升级不会自动改，也不会因此中断）。改动覆盖全部落点：
  `toolboxctl` 的 `PORT` 常量（真源）、`install.sh` 的帮助文本与 dry-run 兜底值、
  `deploy/nginx/default.conf` 的 `listen`、`Dockerfile` 的 `EXPOSE` 与 `HEALTHCHECK`、
  两个 compose 的端口映射与 healthcheck（`8081:8081`），以及 README / 部署文档 /
  快速开始 / 排障 / 发布流程共 12 份文档（中英成对）。
  同时新增 **`TOOLBOX_PORT` 环境变量**（等价 `--port`，优先级 `--port` > 已装实例配置 >
  环境变量 > 默认值），登记进 `.env.example`。
  选 8081 的原因：与容器形态统一、不占特权端口 80（非 root 也能装）、
  且目标机上 80 常被既有站点占用。验证脚本同步扩容到 **133 条用例**
  （A 28 / B 35 / C 23），新增「默认端口正确」与「环境变量可覆盖」两组断言；
  Docker 验证组的宿主端口错开到 8082，好与二进制部署（默认 8081）同机串跑
- **运行环境升级到 Node.js 24**：`engines.node` 由 `^22.22.2 || >=24.15.0` 收紧为
  `^24.15.0 || >=26.0.0`（与 `jsdom@30`、`vitest@5` 的真实下限一致）；新增 `.nvmrc`（`24`）；
  `deploy/docker/Dockerfile` 的 `NODE_IMAGE` 默认值与文档中的构建示例
  由 `node:20-alpine` 改为 `node:24-alpine`；CI 原本已是 Node 24；
  `docs/DEVELOPMENT`（中英）环境要求表与 `docs/guide/configuration`（中英）示例同步更新
- **依赖升级到与 Node 24 兼容的最新稳定版**：`vite` 6 → 8.3.0（打包内核换成 rolldown）、
  `vitest` 3 → 5.0.1、`@vitejs/plugin-react` 4 → 6.1.1、`zod` 3 → 4.6.5、
  `prettier` 3.9.8 → 3.9.9、`turbo` 2.11.2 → 2.11.3，锁文件同步更新。
  **两项有意不升**（理由已写入 `docs/DEVELOPMENT` 环境要求段）：`react-router` 8.x 虽已发布，
  但 `react-router-dom` 至今没有 8.x，单升必然出现双实例；`typescript` 7 虽已发布，
  但 `typescript-eslint` 对 TypeScript 的 peer 仍是 `>=4.8.4 <6.1.0`
- **一键安装入口改为真实直链**：仓库已公开，两份 README、文档总索引与
  `deploy/binary/README.md` 的一键部署命令统一为
  `curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash`，
  并附「先审阅脚本再执行」提示；原先占位式的 `<发布源>/install.sh` 与
  「仓库私有、匿名请求 404」的说明一并更正
- **`docs/审核报告.md` 改名为 `docs/audit-report.md`**：按
  [`docs/spec/11-文档命名规范.md`](docs/spec/11-文档命名规范.md) 的映射统一为英文文件名，
  同步更新两份文档索引与 `check-docs` 的豁免清单

### 修复

- **`upgrade` 对「回退源」会静默降级**：原先只在「源内版本 == 当前版本」时跳过，
  源内版本**低于**当前时（镜像站过期、切回旧源、源内 `latest.txt` 未更新都会造成）
  会直接把线上实例降级——用户以为执行了一次升级。现改为：未显式指定 `--to` 时，
  只要**检测不到更高版本就跳过本次更新**，并给出 `rollback` / `--force` 的可行指引
- **`install` 对已存在的版本直接报错，让一键脚本无法重复执行**：`curl | bash` 重跑
  （修坏掉的配置、重建实例都很常见）会硬失败在「版本 X 已存在」，`install.sh` 又会
  如实把它报成「安装失败」。现改为**幂等复用**已落地的 release，只重跑
  「切 current → 渲染 → 启服务」，与 `upgrade` 对已存在版本的既有行为对齐
- **`check-update` 打印的升级源类型恒为空括号**：`resolve_update_source` 是用
  `$(…)` 命令替换调用的，它在**子 shell** 里给 `SOURCE_KIND` 赋值传不回调用方，
  于是「升级源 : …（url）」里的标签一直是空的。现改为把「源类型 + 版本」拼成一行返回、
  由调用方拆开，不再依赖副作用
- **`logs -n` 不校验行数**：传非数字时把值原样丢给 `journalctl -n` 与 `tail -n`，
  两个命令各自报错又被 `|| true` 吞掉，输出里混着报错却未必以非 0 退出。
  现要求正整数，非法值按用法错误退出（exit 2）
- **本地健康探测被代理劫持，带 `--proxy` 的一键安装必然失败（严重）**：
  `install.sh --proxy` 会把 `http_proxy` / `https_proxy` 导出给子进程，
  `toolboxctl` 探测 `http://127.0.0.1:<port>/healthz` 时继承了它们，请求被发给代理；
  代理转而去访问「它自己的」localhost——而代理那台机器上恰好也装着同款实例
  （返回 404 页面），于是响应体永远不是 `ok vX.Y.Z`，安装报「启动失败」，
  而服务其实完全正常。这也解释了为什么此前只有带代理的路径会命中。
  现 `probe_health` 显式绕开代理（`--noproxy '*'` / `--no-proxy`）；
  远程下载用的 `fetch_text` / `fetch_file` 不受影响，继续走代理
- **启动校验窗口过窄，偶发误报「启动失败」**：窗口原为 15s（60 × 0.25s），
  而目标机实测「从卸载到 `/healthz` 可用」约 12s，正处在临界。
  现延长到 60s，超时提示也改为可执行建议（先 `status` / `logs` 复查，
  确认只是启动慢就 `start`，无需重装）
- **`install.sh` 吞掉落地的失败**：该脚本只有 `set -u`、没有 `set -e`，
  `sh "$CTL" "$@"` 的退出码从未被检查——bundle 内落地失败（非 0）时脚本照样打印
  「安装完成 ✅」并以 0 退出，自动化场景会当成部署成功。现失败即中止并报错
- **`--port` 缺范围校验**：原来只判「是不是数字」，`--port 99999` / `0` 会被放行
  并写进 systemd 单元（目标机上留下过一个「端口 99999」的单元），渲染出的 nginx
  因非法端口起不来。现 `install` 与 `render` 都校验 1-65535
- **`ver_gt` 无法正确比较预发布版本**：该函数用 `split(a, x, ".")` 后逐段 `+0` 比较，
  awk 会把 `0.0.1-beta` 的第三段 `1-beta` 转成数字 `1`，于是
  **`0.0.1-beta` 与 `0.0.1` 被判为「相等」**——引入 beta 版本号后升级与回滚都会误判
  （`check-update` 认不出新版本、`rollback` 误报「目标版本与当前版本相同」）。
  现先把 `-` 后缀剥离单独比较，并遵循 semver 规则（主版本相同时，带预发布后缀的更小）
- **运维子命令静默忽略 `--prefix`（严重）**：`toolboxctl` 只有 `install` / `render` 解析
  `--prefix`，`status` / `stop` / `config` / `list` 等**根本不解析任何参数**，多余 flag 被丢弃，
  操作落到默认 `/opt/toolbox`。目标机上实测 `stop --prefix /tmp/x` 直接停掉了 80 端口的生产服务。
  现由 `main()` 统一预解析 `--prefix`（含绝对路径校验），并对不接受额外参数的子命令报错，
  `uninstall` / `logs` 也随之支持 `--prefix`
- **Docker 形态缺 `/healthz`**：二进制部署有健康检查端点，容器形态返回 404，两种部署无法被
  统一探测。现 `deploy/nginx/default.conf` 增加 `location = /healthz`，版本号由 Dockerfile
  在构建期从 `deploy/binary/VERSION` 注入并断言替换结果
- **打包产物里的 `install.sh` 常年是旧版**：`build-bundle.sh` 不复制它，README 的一键命令
  直链却指向它（历史上一键装到旧脚本复发过不止一次）。现每次打包强制同步
- **`doctor` 在服务未运行时误导**：输出「期望 v0.0.1，实际响应 无」像部署失败，
  实际只是没启动。现先判服务状态，未运行时提示「先执行 start」
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
- **bundle 解包后站点全站 403**：`build-bundle.sh` 用 `mktemp -d`（模式 0700）当 staging 根，
  tar 把这条 `./` 目录项的模式原样记进归档，解包后 `releases/<版本>` 是 `drwx------`，
  nginx worker（nobody / toolbox）连 `stat` 都过不去，只有 `/healthz` 这类
  `return` 型 location 正常。现打包前先把 staging 及子目录统一修成 0755
- **`user` 指令漏组名导致 nginx 起不来**：`toolboxctl` 降级到 `nobody` 运行时渲染出
  `user nobody;`，而 nginx 省略组时会拿用户名当组名，Debian / Ubuntu 上 nobody 的组叫
  `nogroup` → `getgrnam("nobody") failed`。现由 `render_tpl` 探测后补上组名
- **compose 健康检查永远 unhealthy**：exec 数组形式不做 shell 解析，
  `">/dev/null"` 被当成第三个 URL 传给 `wget`，`depends_on` 因此卡死。
  改为不带重定向的 `wget -q -O /dev/null`
- **compose 把宿主机代理透传进构建**：宿主机 `HTTP_PROXY` 指向 `127.0.0.1`，
  在容器里那是容器自己，`pnpm install` 全程 `Connection refused`。
  现改为显式 opt-in（`DOCKER_BUILD_HTTP_PROXY`）
- **未知路径返回 200 + 首页内容（软 404）**：改为真实的 404 状态码并渲染 `404.html`
- **构建分块把共享模块卷进工具 chunk**：i18n 等共享模块被归入某个工具 chunk，
  首屏因此加载整包工具代码 → 显式划分 `app-core`；工具 chunk 13.62KB → 5.08KB
- **工具元数据英文文案不生效**：`generate-catalog` 的字段清单为硬编码，未同步可选字段
- **`toolboxctl` 经 `/usr/local/bin` 软链调用时读不到版本、找不到配置模板**
  → 解析脚本真实路径
- **移动端导航按钮的可访问名与可见文字不一致**（读屏念错）

### 已知限制

- 静态产物固定中文口径，未提供 `/en` 路由（英文仅在客户端切换生效）
- 首屏入口 JS gzip ≈ 88KB，超出文档原定 50KB 预算（React 19 框架基线所致，待拍板放宽）
- 870 个工具中已实现 75 个，其余待铺量
- 制品部署验证（四组 133 条用例）目前是发布前手工执行，尚未纳入 CI——它需要真实目标机
  与 SSH 凭据
- `--prefix` 不是多实例开关：全局配置 `/etc/toolbox/toolbox.conf` 与 systemd unit 名
  均为单例，多实例部署尚不支持

### 计划中

- 铺量 P0 批次（148 个工具），先小批量（10 个）验证再上量
- 补齐工程内部文档的英文版（`docs/spec/`、`docs/tools/` 等 36 份，`pnpm check:docs` 会持续统计）
- Orama 正式接入 + 中文分词、拼音搜索
- T1 / T3–T6 页面模板

[0.0.1-beta]: https://github.com/zhang123999-qq/toolbox/releases/tag/v0.0.1-beta
