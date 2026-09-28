# EIP-712 哈希

EIP-712 结构化数据哈希：`encodeType`、`typeHash`、`domainSeparator`、`structHash` 与最终待签名摘要，纯前端计算。

## 用途

粘贴 EIP-712 TypedData JSON：

```json
{
  "types": { "EIP712Domain": [...], "Mail": [...] },
  "domain": { "name": "Ether Mail", "version": "1", "chainId": 1, "verifyingContract": "0x..." },
  "primaryType": "Mail",
  "message": { ... }
}
```

输出 `encodeType`、各阶段哈希与最终摘要 `keccak(0x19 0x01 ‖ domainSeparator ‖ structHash(message))`。

## 输入

| 字段   | 类型   | 约束                                  |
| ------ | ------ | ------------------------------------- |
| `text` | string | EIP-712 TypedData JSON（四个必填字段）|

支持嵌套 struct、静态 / 动态数组；非法类型、缺字段、数组长度不匹配均报中文错误。

## 说明

- Keccak-256 为本工具内手写实现，无第三方依赖。
- Ether Mail 官方示例向量已验证：domainSeparator `f2cee375…090f`，digest `be609aee…57bd2`。
