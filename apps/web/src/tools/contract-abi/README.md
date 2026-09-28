# 合约 ABI（#711）

粘贴合约 ABI JSON，浏览函数与事件接口，计算 4 字节函数选择器与事件主题哈希。纯前端本地计算。

## 输入

标准以太坊 ABI JSON 数组（`type` 为 `function` / `event` / `constructor` 等）。

## 输出

- 函数：规范签名 `transfer(address,uint256)` → 选择器 `0xa9059cbb`
- 事件：规范签名 → 32 字节主题哈希
- 每个条目的参数列表与 `stateMutability`

支持按名称关键字过滤。`constructor`、`fallback` 等非函数/事件条目会被跳过。

## 说明

- tuple（含嵌套数组）参数会自动展开为规范形式 `(address,uint256)[]`。
- 选择器 = `keccak256(规范签名)` 前 4 字节；事件主题 = 完整 32 字节哈希。
- 本工具只做只读解析，不构造交易（编码 calldata 请用 #695 ABI 编解码）。
