# CSP 指令配置

逐条配置 Content-Security-Policy 各指令的 source 取值，输出完整响应头。
与一键基线版的「CSP 生成」（#127）互补：这里对每条指令单独控制。

## 用途

#127 给的是一套固定基线；本工具把 `default-src` / `script-src` / `style-src` /
`img-src` / `connect-src` / `frame-ancestors` 等 12 条指令摊开成下拉框，
按需选 `'self'` / `'none'` / `*` / `'self' 'unsafe-inline'` / `'self' data:`。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项（source 预设含义）

| 预设          | 落到指令里的值           |
| ------------- | ------------------------ |
| `self`        | `'self'`                 |
| `none`        | `'none'`                 |
| `all`         | `*`                      |
| `self-inline` | `'self' 'unsafe-inline'` |
| `data`        | `'self' data:`           |

- `base-uri` / `form-action` / `frame-ancestors` 不支持 `unsafe-inline` / `data:`，
  只给 `self` / `none` / `all`
- **升级 HTTPS**：追加 `upgrade-insecure-requests`
- **仅上报**：输出 `Content-Security-Policy-Report-Only`（只上报不拦截）

## 输出

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; …

# 可读版本（每条指令一行）
default-src 'self'
script-src 'self'
…
```

## 提醒

- `'unsafe-inline'` 会大幅削弱 `script-src` 对 XSS 的防护，优先用 nonce
- `frame-ancestors` 只能走响应头，不能写 `<meta>`
- 上线前先开「仅上报」观察，确认无误伤再切正式头
- 本工具只产出通用预设，需要 `https://cdn.example.com` 这类自定义来源时请手动追加

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #246                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
