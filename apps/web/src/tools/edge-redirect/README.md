# 边缘重定向（#817）

A 级工具：纯前端本地生成规则 JSON，无网络、无第三方 API。

## 功能

- **生成模式（generate）**：右侧表单填写来源（from）、目标（to）、状态码（301/302/307/308），实时生成 Cloudflare Bulk Redirects 列表 JSON；来源支持 `/old/*` 路径式或 `https://old.example.com/*` 完整 URL 式（含通配符 `*`），目标须为 http/https URL，非法时中文报错。
- **解析模式（parse）**：左侧粘贴已有规则 JSON（数组或 `{redirects: [...]}` 包裹），输出人类可读的规则摘要；非法 JSON 或规则非法时中文报错并标出序号。
- **复制 / 下载**：生成的 JSON 可复制或下载为 `.json`。

## 说明

- 输出的 JSON 可直接用于 Cloudflare 仪表盘的 Bulk Redirects 导入或 API 写入。
- `subpath_matching: true`、`include_subdomains: false` 为 Cloudflare 默认语义，按需修改后使用。
