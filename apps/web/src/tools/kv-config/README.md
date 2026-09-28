# KV 配置（#807）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **片段生成**：生成 `wrangler.toml` 的 `[[kv_namespaces]]` 配置片段，含 `binding`、`id` 与可选 `preview_id`。
- **绑定名校验**：须为合法 JS 标识符（Worker 代码中以 `env.<binding>` 访问，如 `MY_KV`）。
- **ID 校验**：命名空间 ID 须为 32 位十六进制。

## 说明

- 命名空间 ID 来自 `npx wrangler kv:namespace create <名称>` 命令的输出。
- `preview_id` 用于 `wrangler dev` 本地预览，可选；生产与预览建议使用不同命名空间。
- 将生成的片段追加到 `wrangler.toml` 末尾即可。
