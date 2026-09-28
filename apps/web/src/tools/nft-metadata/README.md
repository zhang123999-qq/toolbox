# NFT 元数据

用 `eth_call` 只读调用 NFT 合约的 `tokenURI(uint256)`，再解析元数据并展示名称、描述、图片与属性。不签名、不发交易。

## 用途

看某个 NFT 长什么样、有哪些属性，不用开浏览器插件钱包：填合约地址 + tokenId，一键拉出元数据。

## 输入

| 字段   | 类型   | 约束                                   |
| ------ | ------ | -------------------------------------- |
| `text` | string | tokenId（非负整数），最大 200,000 字符 |

## 选项

| 选项     | 取值                                                         |
| -------- | ------------------------------------------------------------ |
| 合约地址 | ERC-721 / ERC-1155 合约地址（0x + 40 hex）                   |
| RPC 地址 | JSON-RPC 地址，留空用默认公共节点 `https://eth.llamarpc.com` |

## 输出

```text
名称：Cool NFT #1
描述：An example NFT
图片：https://ipfs.io/ipfs/QmHash/image.png
属性（2 项）：
  Color：Blue
  Rarity：Rare
```

## 说明

- tokenURI 支持三种格式：`data:application/json;base64` 内联、`ipfs://`（转 `ipfs.io` 网关）、`https/http` 直链；其他格式会明确报错。
- 依赖公共 RPC 节点，可能限流、超时或被浏览器 CORS 限制；失败会明确报错，可自填其他 RPC 地址重试（地址只保存在页面 state，不写入任何存储）。
- 图片仅展示 URL 文本，不自动加载（避免混合内容与隐私问题）。
