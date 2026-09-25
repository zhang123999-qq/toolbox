# SSH 密钥

用浏览器 WebCrypto 生成 ed25519 / RSA 密钥对，公钥输出 OpenSSH 单行格式，私钥输出 PKCS#8 PEM。

## 用途

临时起一台测试机、配 Git 部署密钥、联调 SSH 白名单时，不必装 `ssh-keygen` 也能拿到一对可用密钥。
密钥全程在浏览器里生成，私钥只出现在你的屏幕上，不会经过任何网络。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框内容会作为**公钥末尾的注释**（comment，相当于 `ssh-keygen -C`）。
留空时不生成任何内容；含空白字符时会明确报错（避免拼出非法的 `.pub` 行）。

## 输出

| 字段   | 类型   | 说明                                  |
| ------ | ------ | ------------------------------------- |
| `text` | string | 注释 + OpenSSH 公钥 + PKCS#8 私钥 PEM |

```text
# 公钥（OpenSSH 格式，可追加到 ~/.ssh/authorized_keys）
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA… toolbox

# 私钥（PKCS#8 PEM，明文，仅供测试，切勿用于生产环境）
-----BEGIN PRIVATE KEY-----
…
-----END PRIVATE KEY-----
```

## 选项

| 选项        | 取值               | 默认    | 说明                                       |
| ----------- | ------------------ | ------- | ------------------------------------------ |
| `algorithm` | ed25519 / rsa      | ed25519 | 算法；ed25519 密钥短、生成快，优先选它     |
| `bits`      | 2048 / 3072 / 4096 | 2048    | 只对 RSA 生效；ed25519 固定 256 bit 无法调 |

**交互**：填好注释后点「运行」才会生成（异步工具不会自动发请求）。
直接点「示例」把注释填成 `generate`，再点「运行」即可产出。**每次生成的结果都不同**。

## 密钥格式说明

- 公钥：`ssh-ed25519 <base64> <comment>` / `ssh-rsa <base64> <comment>`，
  Base64 里是 SSH 线格式：`uint32 长度 + 算法名`、`uint32 长度 + 公钥数据`；
  RSA 多一段 `mpint e` 与 `mpint n`（mpint 会去掉前导零，最高位为 1 时补 `0x00`）
- 私钥：WebCrypto 导出的 **PKCS#8 DER**，转成 PEM（每行 64 字符）。
  OpenSSH 自己的私钥格式是专有封装，PKCS#8 是通用格式，
  `ssh-keygen -p -m PKCS8 -f key.pem` 或 `ssh -i key.pem` 都能吃

## 限制

- **私钥是明文**，只适合测试、临时环境。生产密钥请在离线机器上用 `ssh-keygen` 生成并加口令
- ed25519 走 WebCrypto 的 `Ed25519`，个别老浏览器/嵌入式 WebView 没有实现；
  这种情况下会给出「当前环境的 WebCrypto 不支持 Ed25519，请把算法切换为 RSA」的可读报错，
  切到 RSA 即可继续用
- 只生成密钥对，**不做**公钥指纹展示、不写入 `authorized_keys`、不上传任何位置
- RSA 只支持 2048 / 3072 / 4096；4096 生成较慢（数秒），请耐心等「运行」返回
- 需要 WebCrypto，即 HTTPS 或 localhost

## 数据流向

**纯本地处理。** 密钥对由浏览器 `crypto.subtle.generateKey` 生成，输入与结果都只在内存里，
不发送任何网络请求，不写入服务端。`meta.api = false`，无需自备 API/Key。

## 示例

输入（注释）：

```text
generate
```

输出（ed25519 摘要形态，实际内容每次不同）：

```text
# 公钥（OpenSSH 格式，可追加到 ~/.ssh/authorized_keys）
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA… generate

# 私钥（PKCS#8 PEM，明文，仅供测试，切勿用于生产环境）
-----BEGIN PRIVATE KEY-----
…
-----END PRIVATE KEY-----
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #111                             |
| 域       | `encoding`（编码 / 加密 / 安全） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS + WebCrypto）           |
| 模板     | T2（双栏）                       |
