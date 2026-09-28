# R2 配置（#809）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **片段生成**：生成 `wrangler.toml` 的 `[[r2_buckets]]` 配置片段，含 `binding`、`bucket_name` 与可选 `preview_bucket_name`。
- **桶名校验**：3–63 字符，小写字母 / 数字 / 连字符 / 点，首尾为字母或数字，不含连续点。
- **绑定名校验**：须为合法 JS 标识符（Worker 代码中以 `env.<binding>` 访问）。

## 说明

- 存储桶需先用 `npx wrangler r2 bucket create <桶名>` 创建（或在 Dashboard 创建）。
- `preview_bucket_name` 用于 `wrangler dev` 本地预览，可选。
- 将生成的片段追加到 `wrangler.toml` 末尾即可。
