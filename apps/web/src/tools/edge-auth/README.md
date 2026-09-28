# 边缘鉴权（#818）

A 级工具：纯前端本地生成代码片段，无网络、无第三方 API，不存储任何凭据。

## 功能

- **Basic 模式（basic）**：填写 realm（必填）与可选的预置用户名/密码，生成可直接部署的 Cloudflare Worker HTTP Basic Auth 代码；未预置账号时仅校验请求携带 Authorization 头，并提示接入 KV / 环境变量。
- **JWT 模式（jwt）**：填写 JWKS 地址（须为 https）、issuer、audience，生成基于 WebCrypto 的 JWT 校验代码片段（含过期与声明断言，签名校验处留 TODO 需按所用算法补全）。
- **解析模式（parse）**：左侧粘贴 `Authorization: Basic …` 头，解析出用户名与密码；非法格式中文报错。
- **复制 / 下载**：生成的代码可复制或下载为 `.js`。

## 说明

- 生成的代码仅为模板，生产使用前请按实际密钥管理方案（Workers Secrets / KV）调整。
- 浏览器端的 Basic 头解析仅做 Base64 解码演示，不发送任何请求。
