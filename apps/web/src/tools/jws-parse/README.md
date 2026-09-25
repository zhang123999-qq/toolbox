# JWS 解析

用 HMAC 密钥验签 JWS / JWT，输出 Header、Payload 与结论。

## 用途

确认一个令牌是不是真的由某把密钥签出来的。与「JWT 解析」（只看不验）的区别就在这里：
本工具会真正做一次签名校验，并给出通过 / 失败的原因。

## 输入

| 字段     | 类型   | 约束              | 说明                     |
| -------- | ------ | ----------------- | ------------------------ |
| `text`   | string | 最大 200,000 字符 | compact JWS（3 段）      |
| `secret` | string | 建议 ≥ 16 字符    | 与签名时相同的 HMAC 密钥 |

## 输出

| 字段   | 类型   | 说明                                                        |
| ------ | ------ | ----------------------------------------------------------- |
| `text` | string | `验签通过` + Header / Payload JSON，或 `验签失败：<原因>`     |

## 选项

| 选项        | 取值                  | 默认   | 说明                                     |
| ----------- | --------------------- | ------ | ---------------------------------------- |
| `algorithm` | HS256 / HS384 / HS512 | HS256  | 必须是 header 里 `alg` 写明的那一种      |

## 限制

- 只支持 **HMAC 家族（HS\*）**，不支持 RS / ES / PS 等非对称算法
- **算法必须手动选对**：这是刻意的设计——跟着令牌 header 里的 `alg` 自动选算法，
  正是 `alg` 混淆攻击的入口。选错会明确提示「算法不匹配」
- 验签失败是**结论**而不是异常，输出 `验签失败：…`，不会进入错误态；
  只有「格式不对 / 没填密钥」才算输入错误
- 过期（exp）、未生效（nbf）也会被判为失败，并给出对应原因

## 数据流向

**纯本地处理。** 令牌与密钥只在浏览器内存里参与验签，不发送任何网络请求。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（令牌 + 演示密钥 `demo-secret-1234567890-demo-secret`，HS256）：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA
```

输出：

```text
验签通过：签名与密钥匹配

{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": { "sub": "1234567890", "name": "工具库 Toolbox", "role": "admin" }
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #104                             |
| 域       | `encoding`（编码 / 加密 / 安全） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | C（WebCrypto / jose）            |
| 模板     | T2（双栏）                       |
