# Vercel 配置（#814）

A 级工具：纯前端本地校验，无网络、无第三方 API。

## 功能

- **校验**：左侧粘贴 vercel.json，实时检查 JSON 合法性与结构；source 必须以 `/` 开头，destination 可为站内路径或 http(s) 外链，headers 条目 key 不能为空。
- **格式化**：校验通过后输出 2 空格缩进的规范版本，只保留 rewrites / redirects / headers 三节。
- **摘要**：显示各节条目数；redirects 的 permanent 缺省视为 true。
- **复制 / 下载**：输出可复制或下载为 `.json`。

## 说明

- 本工具不处理 vercel.json 的其他字段（如 buildCommand、env），只关注路由三节。
- 校验通过的 JSON 可直接保存为项目根目录的 `vercel.json`。
