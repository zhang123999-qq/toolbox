# 钱包连接（#708）

通过 **EIP-1193** 连接浏览器注入的以太坊钱包（如 MetaMask、OKX Wallet 等），读取地址、链 ID 与余额。

## 使用

1. 安装 MetaMask（或兼容 EIP-1193 的钱包扩展）并刷新页面；
2. 点击「连接钱包」，在钱包弹窗中授权；
3. 页面展示地址、链 ID、余额（ETH 与 wei）。

## 范围与限制

- **只读**：仅调用 `eth_requestAccounts` / `eth_chainId` / `eth_getBalance`，不构造、不发起任何交易。
- 未使用 WalletConnect 协议（无 relay、无 projectId），不需要任何密钥。
- 多钱包共存时（`window.ethereum.providers` 数组）默认取第一个。
- 断开连接需在钱包扩展内操作，本页面无法主动断开注入连接。
- 未安装钱包扩展时点击连接会明确提示安装，不会静默失败。
