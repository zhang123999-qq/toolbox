# CORS 配置

生成 `Access-Control-Allow-*` 响应头，并附 Nginx 与 Express 两种落地片段。

## 用途

浏览器跨域请求被 CORS 挡住时，靠后端（或网关）回这几个头放行。本工具把
「允许哪些来源 / 方法 / 请求头 / 是否带 Cookie / 预检缓存多久」一次性算成可粘贴的配置。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用，留空不产出。

## 选项

| 选项           | 说明                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| 来源模式       | `allow-all`（`*`）/ `specific`（列出 Origin）/ `same-origin`（不加 ACAO） |
| 允许的 Origin  | 指定来源时填写，逗号分隔，必须带协议与端口（如 `https://a.com:8443`）     |
| 允许的方法     | 默认 `GET, POST, PUT, DELETE, PATCH`                                      |
| 允许的请求头   | 默认 `Content-Type, Authorization`                                        |
| 携带凭据       | 对应 `Access-Control-Allow-Credentials: true`                             |
| 预检缓存（秒） | 对应 `Access-Control-Max-Age`                                             |

## 输出

```text
# 响应头
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization

# Nginx
location /api/ {
    add_header Access-Control-Allow-Origin "https://example.com";
    ...
    if ($request_method = OPTIONS) { return 204; }
}

# Express / Node.js
app.use((req, res, next) => { ... });
```

## 关键规则（工具已强制）

- **`*` 不能与凭据同用**：浏览器规定 `Allow-Origin: *` 时 `Allow-Credentials: true` 会被拒绝，
  本工具直接报错；带 Cookie 的跨域必须**指定具体 Origin**，运行时回显请求的 `Origin`
- **预检 OPTIONS**：跨域非简单请求会先发 `OPTIONS`，服务端必须对它返回 204 且带上同样的头，
  片段里已包含 `if ($request_method = OPTIONS) { return 204; }`
- **Origin 必须精确**：`https://example.com` 不等于 `http://example.com` 或 `https://example.com:443`（443 可省略）

## 限制

- 静态片段里指定多个 Origin 时直接逗号并列；生产环境通常应按请求 `Origin` 白名单回显单个 Origin
- 不处理通配子域（`https://*.example.com`）这种需要运行时判断的情况
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 不发送网络请求。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #245                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
