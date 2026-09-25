# CSP 生成

生成 `Content-Security-Policy` 响应头（或只观察不拦截的 `Report-Only` 版本）。

## 用途

CSP 是最有效的前端 XSS 缓解手段：告诉浏览器「这个页面只允许从哪些来源加载脚本 / 样式 / 图片」。
本工具按常见基线拼出一条可直接粘贴到 Nginx / Cloudflare / Vercel / 后端中间件的策略，
并提供「可读版本」方便逐条 review 与 diff。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

**输入框只作触发用**，内容**不参与**策略内容：留空时不产出任何内容，
点「示例」或随手输入任意字符即按当前选项生成策略。

## 输出

| 字段   | 类型   | 说明                                         |
| ------ | ------ | -------------------------------------------- |
| `text` | string | 第 1 行是可粘贴的单行 Header，随后是可读版本 |

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; …

# 可读版本（每条指令一行）
default-src 'self'
script-src 'self'
…
```

## 选项与指令的映射

i18n 词典里没有「内联脚本 / eval / 升级不安全请求」这类专用文案，
本工具借用了语义最接近的几条通用标签，对照关系如下（**请以本表为准**）：

| 选项 key         | 界面标签     | 落到 CSP 里的语义                                                                  |
| ---------------- | ------------ | ---------------------------------------------------------------------------------- |
| `mode`           | 模式         | 输出 `Content-Security-Policy`（header）还是 `Content-Security-Policy-Report-Only` |
| `target`         | 目标         | `default-src` 的基础值：`self` → `'self'`，`none` → `'none'`                       |
| `strict`         | 严格模式     | 见下方「严格 vs 宽松」                                                             |
| `includeLower`   | 包含小写字母 | **允许内联脚本**：`script-src … 'unsafe-inline'`                                   |
| `includeUpper`   | 包含大写字母 | **允许内联样式**：`style-src … 'unsafe-inline'`                                    |
| `includeNumbers` | 包含数字     | **允许 eval**：`script-src … 'unsafe-eval'`                                        |

**严格 vs 宽松**（`strict` 一个开关承载「限制性指令 + 强制 HTTPS」）：

| 指令                        | 严格模式（默认） | 宽松模式 |
| --------------------------- | ---------------- | -------- |
| `object-src`                | `'none'`         | `'self'` |
| `base-uri`                  | `'self'`         | 不输出   |
| `frame-ancestors`           | `'none'`         | `'self'` |
| `form-action`               | `'self'`         | 不输出   |
| `upgrade-insecure-requests` | 输出             | 不输出   |

固定的基础指令（两种模式都有）：`default-src`、`script-src`、`style-src`、
`img-src 'self' data:`、`font-src 'self'`、`connect-src 'self'`。

## 各指令含义与常见坑

- **`default-src`**：没单独写指令时的兜底。先写它，再逐条放宽，是最省心的顺序
- **`script-src`**：最关键的指令。`'unsafe-inline'` 会让 CSP 对 XSS 几乎失去意义；
  正确做法是**给每个内联 `<script>` 加 nonce**（`script-src 'nonce-<每次请求随机值>'`），
  或把内联代码抽成外部文件。nonce 必须每次请求都变，且不能写进静态 HTML 的缓存副本
- **`style-src`**：`'unsafe-inline'` 常见于依赖行内 `style="…"` 的老组件库；
  先确认能否改成 class，再决定是否放开
- **`'unsafe-eval'`**：`eval` / `new Function` / 部分模板引擎和旧版 Vue 需要它；
  能不用就不用，它是绕过 CSP 的经典通道
- **`img-src 'self' data:`**：允许 `data:` URI 图片（图标、雪碧图很常见）；不需要就删掉
- **`connect-src`**：控制 `fetch` / `XHR` / `WebSocket` 的目标。加了 CDN 或第三方 API 时最常漏这一条，
  漏掉的表现是接口请求被浏览器静默拦下，控制台报 `Refused to connect`
- **`frame-ancestors`**：防「点劫持」的现代替代品（代替 `X-Frame-Options`）。
  注意它**不能**写在 `<meta>` 里，只能走响应头
- **`form-action`**：限制表单能提交到哪，别漏掉自己的登录域名，否则登录会被拦
- **`upgrade-insecure-requests`**：把页面里残留的 `http://` 子资源自动升级为 `https://`。
  整站都上 HTTPS 之后可以常开；如果仍有只能走 http 的内网资源，开了会直接加载失败
- **`Report-Only` 怎么用**：先在**观察期**下发 `Content-Security-Policy-Report-Only`，
  这个头**只上报、不拦截**，配合 `report-uri` / `report-to` 收集违规日志；
  确认日志里没有正常业务被误伤后，再换成正式的 `Content-Security-Policy` 头
- **`report-uri` / `report-to` 已废弃**：报告地址建议改成 `Reporting-Endpoints` 头 + `report-to` 指令；
  本工具只生成策略主体，报告端点需要按部署环境自行拼接
- **多头上限**：一个响应只能有一个 `Content-Security-Policy` 头，多处配置会互相覆盖，
  Nginx `add_header` 与 CDN 规则同时存在时尤其容易踩

## 限制

- 输入框内容不参与策略（只为适配 T2 双栏模板的交互，留空即不产出）
- 只生成**策略主体**，不带 nonce / hash / `report-uri` 这些需要按请求或按构建产出的值，
  也没有覆盖 `sandbox`、`require-trusted-types-for` 等进阶指令
- 生成的策略是通用基线，不是「一键安全」：上线前请结合自己的域名清单核对 `img-src` / `connect-src`
- 不做策略合法性校验，也没有 `frame-ancestors` 之外的兼容性回退
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 纯字符串拼接，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（触发用）：

```text
generate
```

输出（默认：`header` + `self` + 严格模式，未放开内联与 eval）：

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests

# 可读版本（每条指令一行）
default-src 'self'
script-src 'self'
style-src 'self'
img-src 'self' data:
font-src 'self'
connect-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
form-action 'self'
upgrade-insecure-requests
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #127                             |
| 域       | `encoding`（编码 / 加密 / 安全） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |
