# Cloudflare 配置（#813）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **DNS 记录**：按 `key=value` 填写 type（A / AAAA / CNAME / TXT）、name、content、ttl、proxied，输出记录 JSON；自动校验 A 记录 IPv4、AAAA 记录 IPv6、TTL 须为 1（自动）或 ≥30 整数秒。
- **页面规则**：填写 pattern、cacheLevel（basic / simplified / aggressive / bypass）、browserTtl，输出 Cloudflare 页面规则 JSON（含 cache_level 与 browser_cache_ttl 动作）。
- **复制 / 下载**：输出可复制或下载为 `.json`。

## 说明

- 本工具只做配置字符串生成，不会调用 Cloudflare API；生成的 JSON 可直接用于 API 请求体或控制台粘贴。
- proxied 取值 true / false；ttl 留空默认 1（自动）。
