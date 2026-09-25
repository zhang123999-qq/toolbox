# JWT 解析

不验签地读出 JWT 的 Header、Payload 与时间声明。

## 用途

把手里的令牌拆开看清楚：签的是什么算法、里面带了哪些声明、什么时候过期。
调试登录态、核对 `exp` 与服务端时钟、确认 `aud` / `iss` 是否对得上，都用它。

## 输入

| 字段   | 类型   | 约束              | 说明                             |
| ------ | ------ | ----------------- | -------------------------------- |
| `text` | string | 最大 200,000 字符 | compact 序列化的 JWT（`xxx.yyy.zzz`） |

## 输出

| 字段   | 类型   | 说明                                            |
| ------ | ------ | ----------------------------------------------- |
| `text` | string | Header + Payload + 签名原文；若含时间声明则附可读时间与过期判断 |

## 选项

| 选项     | 取值              | 默认   | 说明                     |
| -------- | ----------------- | ------ | ------------------------ |
| `format` | pretty / compact  | pretty | 展开缩进或压成一行       |

## 限制

- **只解析不验签**：任何人都能伪造一个结构正确的令牌，解析结果不能用来判断令牌真假
  （要验签请用「JWS 解析」）
- 解析不出 JWE（5 段加密令牌）的明文，遇到会明确提示改用「JWE 解析」
- 过期判断用的是**你本机的时钟**，服务端时钟不同步时会给出不同结论
- 时间声明（`iat` / `nbf` / `exp`）按秒级 Unix 时间戳解释

## 数据流向

**纯本地处理。** 令牌只在浏览器内存里解码，不发送任何网络请求。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA
```

输出（pretty）：

```json
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": { "sub": "1234567890", "name": "工具库 Toolbox", "role": "admin" },
  "signature": "ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA"
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #101                             |
| 域       | `encoding`（编码 / 加密 / 安全） |
| 大组     | `dev`                            |
| 优先级   | P0                               |
| 可行性   | A（纯 JS：base64url + JSON）     |
| 模板     | T2（双栏）                       |
