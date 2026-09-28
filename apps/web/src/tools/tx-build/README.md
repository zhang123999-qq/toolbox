# 交易构建（#709）

组装**未签名**以太坊交易并 RLP 编码，输出待签名的原始交易 hex。纯前端本地计算。

## 字段

- 交易类型：Legacy / EIP-1559（Type 2）
- nonce、to（收款地址，留空表示合约创建）、value（wei）、data（hex）
- gasLimit；Legacy 填 gasPrice；EIP-1559 填 maxPriorityFeePerGas / maxFeePerGas
- chainId（默认 1；EIP-155 replay 保护）

数值支持十进制或 `0x` hex。

## 输出

RLP 编码的待签名交易（Legacy 为 9 项列表，EIP-1559 为 `0x02` 前缀 + 9 项列表）。
**输出未经签名，没有交易哈希**——需用私钥签名后广播才生效（签名请用 #704 签名验签的思路或钱包完成，本工具不触碰私钥）。

## 校验

编码结果可用 #696 交易解码反向解析验证字段一致。
