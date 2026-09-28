# D1 配置（#808）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **片段生成**：生成 `wrangler.toml` 的 `[[d1_databases]]` 配置片段，含 `binding`、`database_name`、`database_id` 与可选 `migrations_dir`。
- **校验**：绑定名为合法 JS 标识符；数据库 ID 为 UUID 格式；迁移目录不得包含 `..`。
- **建表示例**：按给定表名生成示例 `CREATE TABLE` SQL，可作为迁移文件起点。

## 说明

- 数据库 ID 来自 `npx wrangler d1 create <名称>` 命令的输出。
- 示例 SQL 保存为 `migrations/0001_init.sql` 后，用 `npx wrangler d1 migrations apply <数据库名>` 应用到本地与远程。
- D1 基于 SQLite，示例仅含通用语法。
