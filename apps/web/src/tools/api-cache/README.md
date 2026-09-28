# 接口缓存分析（#761）

A 级工具：纯前端本地计算，无网络、无第三方 API。

## 功能

- **解析**：`Cache-Control`（max-age / s-maxage / no-store / no-cache /
  must-revalidate / no-transform / public / private / immutable）。
- **决策**：按 `s-maxage > max-age > Expires` 优先级给出新鲜度决策
  （新鲜 / 过期需校验 / 禁止缓存）与剩余 TTL。
- **建议**：过期资源结合 ETag / must-revalidate 给出条件请求建议。

## 输入（JSON）

```json
{
  "cacheControl": "public, max-age=3600, must-revalidate",
  "etag": "\"abc123\"",
  "expires": "",
  "age": 0
}
```

## 说明

- `age` 为响应已在缓存中存放的秒数，用于计算剩余 TTL。
- 非法秒数与未知指令会被忽略，不中断解析。
- 所有计算在浏览器本地完成，不发送任何网络请求。
