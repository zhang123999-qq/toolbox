# URL 解析

拆解 URL 的协议、主机、端口、路径、查询参数与锚点。

## 用途

排查重定向、签名 URL、代理配置时，把一条长 URL 拆成结构化字段逐项核对；重复查询参数会合并为数组。

## 输入

| 字段   | 类型   | 约束             |
| ------ | ------ | ---------------- |
| `text` | string | 最大 10,000 字符 |

## 输出

| 字段   | 类型   | 说明                                      |
| ------ | ------ | ----------------------------------------- |
| `text` | string | 结构化 JSON（缩进 2）；空输入返回空字符串 |

输出字段：`href` `origin` `protocol` `username` `password` `host` `hostname`
`port` `pathname` `search` `hash` `searchParams`。

## 选项

无。解析结果是确定的，不需要配置项。

## 限制

- 只接受**绝对 URL**（必须带协议）；`example.com/a`、`/a/b` 会报错
- 解析依赖浏览器标准库 `URL`，遵循 WHATWG 规范（与 Node 一致）
- `username` / `password` 会被解析出来，请勿粘贴含真实凭据的 URL

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```
https://user:pass@006336.xyz:8443/tools/json-formatter?indent=2&tag=a&tag=b#top
```

输出：

```json
{
  "href": "https://user:pass@006336.xyz:8443/tools/json-formatter?indent=2&tag=a&tag=b#top",
  "origin": "https://006336.xyz:8443",
  "protocol": "https:",
  "username": "user",
  "password": "pass",
  "host": "006336.xyz:8443",
  "hostname": "006336.xyz",
  "port": "8443",
  "pathname": "/tools/json-formatter",
  "search": "?indent=2&tag=a&tag=b",
  "hash": "#top",
  "searchParams": {
    "indent": "2",
    "tag": ["a", "b"]
  }
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #182                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P0                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
