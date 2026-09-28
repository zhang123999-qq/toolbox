# 接口加密（#758）

C 级工具：使用浏览器 / Node 内置 WebCrypto 本地计算，无第三方 API。

## 功能

- **加密**：输入明文与密码，PBKDF2（SHA-256、10 万次迭代、随机 16 字节 salt）
  派生 AES-GCM 256 密钥加密，输出 JSON 载荷
  `{ v, kdf, iter, salt, iv, data }`（salt / iv / 密文均为 Base64）。
- **解密**：粘贴载荷 JSON 并输入密码，还原明文；密码错误或数据被篡改时报中文错。

## 说明

- 密码只保存在页面内存（React state）中：不写入 localStorage、不记日志、不上报网络。
- salt / iv 每次随机生成，同一明文每次加密结果不同。
- 测试用固定 salt / iv 向量做确定性断言（独立用 Node webcrypto 计算）。
