# JWE 解析

用口令解密 JWE（JSON Web Encryption）并还原明文。

## 用途

JWE 是「加密过的 JWT」——5 段、肉眼看不到 payload。本工具把它解开，
用于确认加密内容对不对、口令是否是那一个。

## 输入

| 字段     | 类型   | 约束              | 说明                                          |
| -------- | ------ | ----------------- | --------------------------------------------- |
| `text`   | string | 最大 200,000 字符 | compact JWE（`header.encryptedKey.iv.ciphertext.tag`） |
| `secret` | string | 任意              | 口令，与加密时相同                            |

## 输出

| 字段   | 类型   | 说明             |
| ------ | ------ | ---------------- |
| `text` | string | 解密后的明文文本 |

## 选项

本工具**没有选项**：解密参数（`alg` / `enc`）写在 JWE 自己的 header 里，
跟着令牌走；让人手选一个「算法」反而会掩盖「这串令牌到底怎么加密的」这个事实。

## 限制

- 只支持 `alg=dir` + `enc=A256GCM`：密钥由口令派生，密文自带 GCM 认证标签。
  RSA-OAEP / ECDH-ES 等需要私钥或对方公钥的变体不支持
- **密钥派生用 SHA-256(口令)**：这是为了让同一个口令在任何地方都能算出同一把密钥，
  便于对照调试。**生产环境请不要这样做**——口令派生应该用 PBKDF2 / Argon2
  （本站另有「PBKDF2」「Argon2 哈希」两个工具）
- 口令错误时 GCM 认证会失败，工具报错而不产出乱码
- 解密结果按 UTF-8 解释；若原文是二进制（图片、压缩包）会报错

## 数据流向

**纯本地处理。** 密文与口令只在浏览器内存里参与运算，不发送任何网络请求。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（JWE + 口令 `demo-secret-1234567890-demo-secret`）：

```text
eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..yw7egmC1HndX1rp2.qWLdkuwWus2nYzE4Jbye-CkIWvc81g7exWHOvW3PVJ5dzIIkVSs.50UJFMKhbCdXVRYCxSf5xA
```

输出：

```text
这是一段被 JWE 加密的明文。
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #103                             |
| 域       | `encoding`（编码 / 加密 / 安全） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | C（WebCrypto / jose）            |
| 模板     | T2（双栏）                       |
