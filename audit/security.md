# 维度 3 · 安全与隐私审计 — toolbox

审计对象：`D:\default-workspace\toolbox`（monorepo，`apps/web` + `deploy/` + 根配置）。
方法：grep/read 取证。每条结论带 `文件:行号`。评级：P0 = 可利用/生产防护失效（附修复代码）；P1 = 高风险隐患/隐私外泄面；P2 = 加固与卫生。

> TL;DR：没有发现可直接利用的存储型 XSS——全站 `dangerouslySetInnerHTML` 已收敛到 `SafeHtml`，真 HTML 汇走自研白名单 `sanitizeHtml`，`eval`/`postMessage`/`cookie` 零使用，零追踪脚本、零外链字体。但生产 CSP 只有 `Report-Only` 且带 `'unsafe-inline'`，等于攻击发生时没有第二道防线（P0）；`trusted` 旁路、密钥明文进 `localStorage`、CDN 旧版 echarts、以及文档声称用 DOMPurify 实际手写清洗，构成 P1。

---

## P0（生产防护失效 · 附修复代码）

### P0-1 · CSP 仅 `Report-Only` + `'unsafe-inline'`，生产环境零强制 — deploy/nginx/default.conf:32, deploy/binary/packaging/nginx.conf.tpl:65

两份 nginx 模板（Docker 形态与二进制形态）下发的都是观察头，且 `script-src 'self' 'unsafe-inline'` 与 `index.html` 的内联偏好脚本互为因果：

- `deploy/nginx/default.conf:32` 与 `deploy/binary/packaging/nginx.conf.tpl:65`：
  `add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; ..."`
- 内联脚本本体在 `apps/web/index.html:11-43`（读 `localStorage` + `setTimeout`），是 `'unsafe-inline'` 的唯一正当用途。
- 团队自己的 `security-headers` 工具也明知缺失会报"风险"（`apps/web/src/tools/security-headers/utils.ts:72,98-140`），但生产模板未按自家标准执行；文档把"观察后再强制"（`docs/DEPLOYMENT.md:445-446`）写成已知待办，观察期显然已过（v0.0.8，CHANGELOG 已记录安全加固版，`CHANGELOG.md:61-69`）。

后果：`Report-Only` 永不拦截；即便转正，`'unsafe-inline'` 也使 CSP 对注入脚本无防御（内联 `<script>` 可直接执行）。全站 XSS 防护只剩 `sanitizeHtml` 这一道单线。

**修复代码（三步，缺一不可）：**

1. 把 `index.html:11-43` 内联脚本抽到独立文件 `apps/web/public/prefs-init.js`，并在构建期计算 SHA-256 哈希（或改用 nonce 注入）。抽出后 `index.html` 只保留：

```html
<script src="/assets/prefs-init.js" async></script>
```

2. Vite 构建侧给该文件加 `integrity` 校验（构建脚本核对 hash），nginx 侧下发**强制** CSP（去掉 `Report-Only`，去掉 `'unsafe-inline'` 的 script 侧；style 若 Tailwind 需要 inline，改用 hash 或移入 `<link>`）：

```nginx
# deploy/nginx/default.conf:32（与 nginx.conf.tpl:65 同步修改）
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.openai.com https://api.exchangerate.host https://dns.google https://rdap.org https://eth.llamarpc.com https://geo.datav.aliyun.com https://cdn.jsdelivr.net; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri /csp-report" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

> 注意：`connect-src 'self'` 现状与 ~10 个需联网工具（见 §2 外部资源）冲突，强制 CSP 必须先把白名单补齐，否则会误伤业务——这正是 Report-Only 长期未转正的根因，iolist 不改则不要硬转正。

3. 加 `report-uri`（或 `report-to`）端点，把违规先收集到日志再调策略。

---

## P1（高风险隐患 / 隐私外泄面）

### P1-1 · `SafeHtml` 的 `trusted` 是无校验的布尔旁路，且安全检查是空操作 — apps/web/src/shared/SafeHtml.tsx:15-31

```tsx
if (!trusted && html.includes('dangerouslySetInnerHTML')) {
  // 开发阶段警告：……（空块，无任何处理）
}
dangerouslySetInnerHTML={{ __html: html }}
```

`SafeHtml` 渲染前不做任何清洗/拒绝；`trusted={true}` 只是一个调用方自证。ESLint 规则（`eslint.config.js:74-82`）只限制了 `dangerouslySetInnerHTML` 出现在 `SafeHtml.tsx` 内部，**不限制谁可以传 `trusted={true}`**。本次 17 处 `trusted` 调用经抽查当前均安全（见"已验证"），但新增工具时误传用户输入 + `trusted` 即可绕过白名单，且 CI 抓不住。

当前抽查安全的 `trusted` 路径（输入均经转义/白名单校验）：

| 工具                                                                           | 证据                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| timeline-gen                                                                   | `utils.ts:47,146-162` 全部 `escapeHtml`                                                                                        |
| svg-game                                                                       | `utils.ts:227-241` 输入经 `validateHex` 校验                                                                                   |
| text-to-qr                                                                     | `utils.ts:71` 只输出数字矩阵                                                                                                   |
| avatar / er-gen / flowchart / gantt / mindmap / sequence / uml（mermaid 家族） | `securityLevel: 'strict'` 如 `er-gen/Tool.tsx:34`、`flowchart/Tool.tsx:29`                                                     |
| pdf-to-html                                                                    | `Tool.tsx:189-193` 注意：**未走 `sanitizeHtml`**，而是逐行 `escapeHtml`（`utils.ts:147-154,175-188`），属独立安全路径，见 P2-2 |

**修复建议：** `SafeHtml` 改为类型级二选一：`html`（内部强制 `sanitizeHtml`）与 `trustedHtml`（仅接受品牌类型 `TrustedHtml`，仅白名单工具可构造）；删除空检查块；ESLint 增加 `SafeHtml` `trusted` 传参审查规则。

### P1-2 · API Key 明文写入 `localStorage`，任一 XSS 即可全量窃取 — model-compare/Tool.tsx:21-30,148-149,180-181；prompt-optimize/Tool.tsx:22-23,57-63,113-118

- `model-compare` 把两把 Key 放 `toolbox:model-compare:key-a/b`，`Tool.tsx:180-181` 写入，`26` 读回；
- `prompt-optimize` 在勾选"记住"时写入 `toolbox:prompt-optimize:api-key`（`113-118`），启动即读回（`57-63`）。
- 其余 AI 工具（`lib/ai.ts:9`、`ai-detect`、`ai-image-gen` 等 10+ 工具）声明"Key 只进内存、不写 localStorage"，经核实与代码一致——问题只在上述两处。

`localStorage` 对同源任意脚本可读：P0-1 未修复前，任何 XSS（含未来引入的第三方脚本）可一键读走 Key。权衡：BYOK 场景下"记住 Key"是真实需求，且两处均有"清除 Key"按钮（`model-compare/Tool.tsx:148-149`、`prompt-optimize/Tool.tsx:79-88`），不构成误导。

**修复建议：** 默认改为 `sessionStorage`（关页即失）；或 Web Crypto 派生键加密后存（口令不落盘）；至少在 UI 上对该行为加"仅本机、XSS 可读"的显式风险提示；README 现有表述（"保存在 localStorage"）与实现一致，保持即可。

### P1-3 · 文档声称 DOMPurify 清洗，实际是自研白名单，依赖闲置 — docs/audit/code-quality.md:90 vs apps/web/src/shared/sanitizeHtml.ts:5

- `docs/audit/code-quality.md:90` 称 `SafeHtml` + DOMPurify (v3.4.17) 清洗；
- 实际 `sanitizeHtml` 是 `word-view/utils.ts:53-177` 的手写 DOMParser 白名单（`shared/sanitizeHtml.ts:5` 只是转发）；
- `apps/web/package.json:46` 声明了 `dompurify@^3.4.17`，根 `package.json:56-60` 还给它配了 `pnpm.overrides`，但全仓 `src` 内零 `import DOMPurify`（仅 `pnpm-lock.yaml` 命中）。

手写实现本身本次未发现可绕过项（白名单标签+属性、丢弃 `script/style/iframe` 等、href/src 协议白名单，`word-view/utils.ts:100-124`，且有 3 类 XSS 载荷单测 `diff-highlight/test.ts:35-48`、`text-workbench/test.ts:59-71`），但与文档不符意味着：维护者会误以为有 DOMPurify 的 mXSS 防护，而这份代码长期不进安全回归（无 fuzz、无上游更新）。且 `img src` 允许任意 `http(s)`（`word-view/utils.ts:116,146-150`）：恶意 docx 可夹带追踪像素（隐私外泄），`data:image/` 还允许 `data:image/svg+xml`。

**修复建议：** 二选一并统一文档——(a) 真正引入 DOMPurify 替换手写函数（依赖已在，改动面小）；或 (b) 修正 `code-quality.md:90` 表述，并给手写清洗加 fuzz 用例。`img src` 建议收紧为 `data:image/png|jpeg|gif|webp` 或同源，`a href` 保留时补 `rel="noopener"`。

### P1-4 · CDN 拉取旧版 echarts(4.9.0，2021) 且无完整性校验 — apps/web/src/tools/map/utils.ts:21

`map` 工具运行时 `fetch` 世界地图 geoJSON：`https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json`（`map/utils.ts:19-23`），中国地图来自 `geo.datav.aliyun.com`（`16`）。2021 年的 echarts 4.9.0 长期无安全更新；且 CSP 现状 `connect-src 'self'` 若转正必然断掉该工具（见 P0-1 修复注）。另 `badge` 工具指向 `img.shields.io`（`badge/utils.ts:17`）属生成代码，非运行时加载。

**修复建议：** geoJSON 自托管到 `apps/web/public/`（与 `.webp` 资源同例），消除 CDN 依赖与外发；或至少升级到 echarts 6 对应版本并固定 SRI。

### P1-5 · 供应链：个人信息 scope 包 + postinstall 下载脚本，CI 无 `pnpm audit` — apps/web/package.json:19-20,15

- `@neslinesli93/qpdf-wasm@0.3.0`（`apps/web/package.json:20`）与 `@neo-office/renderer@0.1.1`（`:19`）是个人/小众 scope，非主流厂商，投毒或停更风险高于主流包；
- `apps/web/package.json:15` 的 `postinstall` 执行包内 `download.js`，会下载二进制（构建期 RCE 面）；CI 用了 `pnpm install --frozen-lockfile --ignore-scripts`（`.github/workflows/ci.yml:43`、`release.yml:58`），已规避 CI 侧，但本地 `pnpm install` 无此保护；
- `.github/workflows/ci.yml:72-73` 只校验许可证，无 `pnpm audit` / OSV 步骤；`pnpm.overrides` 已意识到风险（`package.json:56-60` 给 `dompurify/image-size/source-map-js` 钉版），但未推广成审计门禁。

**修复建议：** CI 加 `pnpm audit --audit-level high`（或 OSV）；`postinstall` 改为显式手动脚本；对 `@neslinesli93/qpdf-wasm` 评估官方替代（如 npm 上游 qpdf wasm）。

### P1-6 · 零追踪声明与联网工具并存——外发域名很多，按工具逐个知情 — 若干

站点主张"纯本地"，但以下工具运行时必外发（均已在各自 README 披露，属知情同意，但隐私页应汇总）：

| 域名                                       | 用途                             | 证据                                    |
| ------------------------------------------ | -------------------------------- | --------------------------------------- |
| `api.openai.com`（默认）/ 用户自填 baseURL | 全部 AI 工具，Key 随请求发送     | `ai-detect/utils.ts:12`、`lib/ai.ts:61` |
| `eth.llamarpc.com`（默认 RPC）             | chain-query / contract-sim / ens | `chain-query/utils.ts:10`               |
| `dns.google/resolve`                       | dns-query                        | `dns-query/utils.ts:60`                 |
| `rdap.org`                                 | whois-lookup                     | `whois-lookup/utils.ts:97`              |
| `api.exchangerate.host/convert`            | exchange-rate                    | `exchange-rate/utils.ts:11`             |
| `geo.datav.aliyun.com`、`cdn.jsdelivr.net` | map                              | `map/utils.ts:16,21`                    |

**修复建议：** 在站点 Footer/隐私说明汇总"哪些工具会联网、发往何处"，并提示 chain-query 这类公共 RPC 会暴露查询地址。

---

## P2（加固 / 卫生）

### P2-1 · 缺少 HSTS / Permissions-Policy / COOP·COEP·CORP / CSP 上报端点

两份 nginx 模板只有 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`（`deploy/nginx/default.conf:27-29`、`nginx.conf.tpl:60-62`，`nginx.conf.tpl:37` 另有 `server_tokens off` 而 Docker 形态未同步）：

- 无 `Strict-Transport-Security`（站点经 HTTPS 部署，`package.json:7` homepage 即 https）；
- 无 `Permissions-Policy`：相机/麦克风/定位工具（`camera-photo/Tool.tsx:54`、`audio-record/Tool.tsx:118`、`geolocation/Tool.tsx:22` 等）依赖浏览器权限弹窗，站点级未收敛；
- `wasm` 工具（pdfjs/qpdf/blake3）未配 `Cross-Origin-Opener/Embedder-Policy`，`SharedArrayBuffer` 类路径受影响；
- CSP 无 `report-uri`/`report-to`，观察期上报无处可去，`docs/DEPLOYMENT.md:446` 只能靠人工看日志。

**修复建议：** 与 P0-1 同批补齐 HSTS + Permissions-Policy（`geolocation=(), camera=(), microphone=()` 按工具路由细化）+ `report-to`。

### P2-2 · `pdf-to-html` 绕过 `sanitizeHtml` 走自研 `escapeHtml`（当前安全，但脆弱）

`pdf-to-html/Tool.tsx:189-193` 直接 `<SafeHtml html={pdfToHtmlFragments(...)}>`（注意：无 `trusted`，也不经 `sanitizeHtml`），安全性全靠 `utils.ts:147-154` 的 `escapeHtml` 与调用点全覆盖（`175-188`）。已核实：文本逐行转义、`pageNum` 为整数拼入 `data-page`（`200`）、`wrapHtmlDocument` 的 title 同样转义（`265`）。建议把该路径改走 `sanitizeHtml` 做纵深，或在 `Tool.tsx` 补注释说明"为何不走 sanitizeHtml"。

### P2-3 · `word-view` 的 `escapeHtml` 漏转单引号 — word-view/utils.ts:180-186

只转 `&<>"`，漏 `'`。当前使用点是下载文档的 `<title>` 元素内容（`207`），上下文内安全；但作为共享函数易被误用到属性上下文。pdf-to-html 版（`pdf-to-html/utils.ts:147-154`）是全的。建议统一补 `'` → `&#39;`。

### P2-4 · 安全工具自身即代码生成器：提示注入面（低）

`cors-config`（`utils.ts:103-109` 拼 `add_header`）、`csp` / `csp-config`、`nginx-config`、`security-headers` 等工具生成可直接粘贴的服务器配置；其 `test.ts` 已校验换行注入（`cors-config/test.ts:71-72`、`nginx-config/test.ts:54-58`）。风险在用户复制到生产：`cors-config` 允许生成 `Access-Control-Allow-Origin *` + `Credentials` 组合、或 `Allow-Origin *`（`utils.ts:103`）。属工具定位，非应用漏洞；建议输出时对危险组合加显式警告。

### P2-5 · 密码学依赖与教育性弱哈希 — apps/web/package.json:26,30,53,67

`crypto-js`（含 MD5/SHA1）、`md5-hash`、`sha1-hash` 等工具本身即教学用途，无安全宣称；`node-forge`（`cert-generate/utils.ts:27`）、`openpgp`（`:55`）、`jose`（`:43`）均为成熟库。`echarts@^6.1.0`（`:35`）为当前主流版本。建议 README 对 md5/sha1 工具保留"非安全用途"提示（多数已含）。

### P2-6 · `chart-export` 的 `outerHTML` 序列化（非汇）— chart-export/Tool.tsx:130

`new Blob([svg.outerHTML], ...)` 是从 echarts 画布读出后下载，方向是"读 DOM → Blob"，非注入汇，无风险。已确认非问题，记录备查。

---

## 已验证（正面结论，免检项）

- **无 `eval` / `new Function` / 字符串 `setTimeout`**：全仓仅 `userscript-debug` 把它们当"待分析文本"（`userscript-debug/utils.ts:108`），无真实执行。
- **无 `postMessage` / `window.open` 滥用 / `document.cookie` 写入**：`src` 内零命中（`content-script/utils.ts:126` 的 `sendResponse` 为生成代码字符串）。
- **`target="_blank"` 均带 `rel="noopener noreferrer"`**：`components/layout/GitHubLink.tsx:18-20`；`geolocation/Tool.tsx:78-80` 带 `noreferrer`。
- **无追踪/统计脚本、无外链字体**：全仓零 `gtag/googletagmanager/analytics/posthog/sentry` 命中；字体未用 Google Fonts，`index.html` 与 CSS 均为系统字体栈。唯一外部请求是 §P1-6 的业务性 API 与 map CDN。
- **无 `dangerouslySetInnerHTML` 越界**：除 `SafeHtml.tsx:30` 外零命中（测试文件 `.innerHTML` 断言除外），与 `eslint.config.js:74-82` 及 `shared/eslint-exceptions.md:1-3` 的"已清零"陈述一致。
- **`innerHTML` 汇仅剩清洗器自身**：`word-view/utils.ts:176` `host.innerHTML` 为清洗输出，非用户直通。
- **偏好存储无敏感数据**：`lib/prefs.ts:9-10` 仅 `toolbox.locale/theme`，`index.html:25-35` 读取时做白名单校验（非 `en/zh` 回落中文）。
- **许可证红线成立**：`scripts/check-licenses.ts`（GPL/AGPL/SSPL/BUSL 直接 deny，`135-137`）+ CI 门禁（`.github/workflows/ci.yml:72-73`）；间接依赖例外（khroma/duck）已登记证据（`check-licenses.ts:101-123`）。未发现 GPL 污染。
- **Vite 无 CSP 插件**：`apps/web/vite.config.ts:7` 仅 `react/tailwind/wasm`，`server` 未配 `headers`——开发态无安全头，属可接受（生产走 nginx），P2 备案。

---

## 修复优先级清单

| 编号   | 事项                                | 一句话动作                                   |
| ------ | ----------------------------------- | -------------------------------------------- |
| P0-1   | CSP Report-Only + unsafe-inline     | 拆内联脚本，转正 CSP，补 HSTS/白名单/上报    |
| P1-1   | `trusted` 布尔旁路                  | 类型级 TrustedHtml，删空检查，加 ESLint 审查 |
| P1-2   | Key 明文 localStorage               | sessionStorage/加密，UI 风险提示             |
| P1-3   | DOMPurify 名实不符                  | 引入 DOMPurify 或改文档+ fuzz                |
| P1-4   | map CDN 旧版                        | geoJSON 自托管，升级 echarts 数据            |
| P1-5   | 小众 scope + postinstall + 无 audit | CI 加审计，postinstall 显式化                |
| P1-6   | 联网工具外发汇总                    | 隐私页汇总外发域名                           |
| P2-1~6 | 头部补齐等                          | 随 P0 批 / 顺手修                            |

_审计取证：2026-11-04，grep/read 全量。所有行号基于当前 HEAD（toolbox v0.0.8）。_
