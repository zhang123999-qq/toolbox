# 接口签名（#757）

C 级工具：使用浏览器 / Node 内置 WebCrypto 本地计算，无第三方 API。

## 功能

输入请求方法、路径、待签参数（JSON 对象）、密钥，工具按 key 排序拼接参数，
构造待签字符串并计算 HMAC-SHA256 签名（hex / base64 可选），支持验签。

默认待签字符串模板（5 行）：

```
METHOD
PATH
QUERY（排序后的 k=v&k=v）
TIMESTAMP
NONCE
```

也支持自定义模板，占位：`{method} {path} {query} {timestamp} {nonce}`。

## 说明

- 密钥只保存在页面内存（React state）中：不写入 localStorage、不记日志、不上报网络。
- 测试用 Node 真实 webcrypto 计算固定向量断言。
