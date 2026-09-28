# ENS 解析

ENS 域名 namehash 计算（本地）与链上正向解析：`registry.resolver(node)` → `resolver.addr(node)` 两次 `eth_call`。

## 用途

输入 ENS 名称（如 `vitalik.eth`）与公共 RPC 地址，点「运行」查询该名称的 resolver 合约与地址记录。

## 输入

| 字段     | 类型   | 约束                                   |
| -------- | ------ | -------------------------------------- |
| `text`   | string | ENS 名称                               |
| `rpcUrl` | string | 公共 RPC 地址（默认 eth.llamarpc.com） |

## 网络与限制

- 纯浏览器内请求公共 RPC，无后端中转；RPC 地址只保存在页面内存中。
- 公共 RPC 常见限制：**限流（429）**、**CORS**（部分节点拒绝浏览器跨域）、**超时**（默认 15 秒），失败时均报中文错误，不伪造结果。
- 如遇限流/CORS，可换用其他公共节点（如 `https://cloudflare-eth.com`、`https://rpc.ankr.com/eth`）或自建节点。

## 说明

- 名称规范化为简化版（去空白 + 小写），**不是**完整的 UTS-46 / IDNA 规范化，大小写与特殊字符域名的行为可能与官方 App 不一致。
- Registry 地址：`0x00000000000C2CAA39b223FE8D0A0e5C4F27eAD`（主网）。
- 未设置 resolver 或地址记录的名称会明确报错。
