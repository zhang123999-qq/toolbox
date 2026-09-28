# CSP 配置（#777）

A 级工具：纯前端本地生成与校验，无网络、无第三方 API。

## 功能

- **生成**：输入 JSON 配置，生成 `manifest.json` 中
  `content_security_policy.extension_pages` 的策略字符串。
  - `preset: "minimal"`（推荐）：`script-src 'self'; object-src 'self'`；
  - `preset: "development"`：额外放宽 `'wasm-unsafe-eval'`（WebAssembly 需求）；
  - 也可自定义 `scriptSrc` / `objectSrc` / `styleSrc`。
- **校验**：MV3 禁止项检查——远程代码（`http(s)://` 来源）、`'unsafe-eval'` 报
  error；`'unsafe-inline'`、缺少 `'self'`、缺少 `object-src` 报 warning。

## 输入配置（JSON）

```json
{ "preset": "minimal" }
```

```json
{
  "scriptSrc": ["'wasm-unsafe-eval'"],
  "objectSrc": "'self'",
  "styleSrc": ["'self'"]
}
```

## 说明

- MV3 扩展页的 `script-src` 仅允许 `'self'` 与 `'wasm-unsafe-eval'`，任何远程脚本
  来源都会被构建器拒绝并在校验中报 error；如需 WASM 请用 `'wasm-unsafe-eval'`
  而非 `'unsafe-eval'`。
- 生成的字符串可直接填入 manifest.json（可用 #771 Manifest V3 生成工具）。
- 所有处理在浏览器本地完成，不发送任何网络请求。
