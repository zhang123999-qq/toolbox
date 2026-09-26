# JWT 生成

用 HMAC 密钥给一份 JSON payload 签名，生成 JWT（HS256 / HS384 / HS512）。

## 用途

造一个能直接拿去联调的令牌：填好 payload 和密钥，立刻得到 compact 序列化的 JWT。
也可反向验证服务端用的密钥对不对——同样的 payload 与密钥应当得到同样的签名段。

## 输入

| 字段     | 类型   | 约束              | 说明                    |
| -------- | ------ | ----------------- | ----------------------- |
| `text`   | string | 最大 200,000 字符 | JSON 对象形式的 payload |
| `secret` | string | 建议 ≥ 16 字符    | HMAC 密钥，任意字符串   |

## 输出

| 字段   | 类型   | 说明                                  |
| ------ | ------ | ------------------------------------- |
| `text` | string | compact 序列化的 JWT（`xxx.yyy.zzz`） |

## 选项

| 选项        | 取值                  | 默认  | 说明          |
| ----------- | --------------------- | ----- | ------------- |
| `algorithm` | HS256 / HS384 / HS512 | HS256 | HMAC 摘要算法 |

## 限制

- 只支持 **HMAC 家族（HS\*）**。RS256 / ES256 等非对称算法需要私钥 PEM 与更完整的
  密钥管理，请先用「密钥生成」产出密钥，再考虑用 CLI 侧工具签名
- **不会自动写入 `iat` / `exp`**：过期时间属于业务决策，且写入当前时间会让同一份输入
  每次产出不同令牌（示例与自动化都不可复现）。需要就自己写进 payload：
  `{"exp": 1735689600}`
- 密钥短于 16 字符会被拒绝：HMAC 密钥太短等同于没有安全性
- payload 必须是 JSON **对象**，数组或标量会被拒绝（校验库普遍不接受）

## 数据流向

**纯本地处理。** payload 与密钥只在浏览器内存里参与签名，不发送任何网络请求。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```json
{ "sub": "1234567890", "name": "工具库 Toolbox", "role": "admin" }
```

密钥 `demo-secret-1234567890-demo-secret` + HS256，输出：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #102                             |
| 域       | `encoding`（编码 / 加密 / 安全） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | C（WebCrypto / jose）            |
| 模板     | T2（双栏）                       |
