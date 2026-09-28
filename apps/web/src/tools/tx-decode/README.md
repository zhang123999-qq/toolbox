# 交易解码（#696）

解码以太坊原始交易：手写 RLP 解析（带规范性校验），支持 Legacy、EIP-2930（Type 1）、EIP-1559（Type 2），输出全部字段与交易哈希（`keccak256`）。纯前端实现，不联网。

## 输入

原始交易 hex，可带 `0x` 前缀，可含换行/空格：

```
0xf871078504a817c800825208947e5f4552091a69125d5dfcb7b8c2659029395bdf880de0b6b3a7640000...
```

## 输出

- **交易类型**：Legacy / EIP-2930 (Type 1) / EIP-1559 (Type 2)
- **交易哈希**：`keccak256` 签名后完整字节
- **chainId**：Legacy 从 `v` 按 EIP-155 推导（`v=27/28` 为未启用 EIP-155；`r/s` 为空时为待签名交易）
- **各字段**：nonce、gasPrice / maxPriorityFeePerGas / maxFeePerGas、gasLimit、to（空为合约创建）、value（wei 十进制 + hex）、data（可打印 ASCII 附带文本）、accessList（JSON）、v / yParity、r、s

## 说明

- RLP 非规范编码（单字节包装、前导零、长短格式混用、整数前导零）一律报错，不做容错解码。
- 暂不支持 Type 3（blob）及以上类型，会明确提示。
- 本工具只做解码，不做签名；不恢复发送方地址。
