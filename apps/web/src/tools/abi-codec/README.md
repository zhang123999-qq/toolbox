# ABI 编解码（#695）

以太坊合约 ABI 编解码：函数选择器计算、调用参数编码为 `calldata`、完整 `calldata` 解码回参数值。纯前端实现（手写 Keccak-256），编码结果已用 Python `eth-abi` 独立验证。

## 输入

- **函数签名**：如 `transfer(address,uint256)`（参数名可选，如 `transfer(address to,uint256 amount)` 也可）。
- **编码模式**：参数区每行一个值，顺序与签名一致。
- **解码模式**：参数区填完整 calldata（含 4 字节选择器），自动校验选择器与签名匹配。

## 支持的类型

`uint<M>` / `int<M>`（十进制或 `0x` 十六进制）、`address`（40 位 hex）、`bool`（true/false/1/0）、`bytes<M>`（`0x` hex）、`bytes`、`string`、定长/动态数组（`uint256[]`、`address[2]` 等，JSON 数组表示）、嵌套数组。

## 值格式

- `uint` → 十进制；`int` → 十进制（可负）；`address` → EIP-55 checksum；`bool` → `true`/`false`
- `bytes<M>` / `bytes` → `0x` hex；`string` → 文本原文；数组 → JSON
- 编码时：数值可用十进制或 `0x` 十六进制；`int` 的 `0x` 视为补码位模式；数组用 JSON（如 `["hello","world"]`）

## 输出

- **编码**：函数名、选择器（`0xa9059cbb`）、参数类型列表、完整 calldata。
- **解码**：函数名、选择器、各参数类型与解码值。

## 说明

- 选择器 = `keccak256("transfer(address,uint256)")` 前 4 字节（规范形式签名）。
- 动态类型按 ABI 规范使用偏移 + 尾段编码；定长静态数组内联拼接。
- 非法输入（类型名错误、越界、calldata 截断、选择器不匹配）均抛中文错误。
