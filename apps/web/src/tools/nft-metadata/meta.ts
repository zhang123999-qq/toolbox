import type { ToolMeta } from '@toolbox/catalog'

/**
 * nft-metadata —— 全局编号 #698
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 * NFT 元数据：eth_call 调 tokenURI，解析 data:/ipfs/https 元数据并展示（只读） */
export const meta: ToolMeta = {
  id: 'nft-metadata',
  slug: 'nft-metadata',
  title: 'NFT 元数据',
  description: 'NFT 元数据：eth_call 查询 tokenURI，解析并展示名称、描述、图片与属性',
  titleEn: 'NFT Metadata',
  descriptionEn:
    'Fetch NFT metadata: eth_call tokenURI then resolve and display name, image and attributes',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'nft', 'token-uri', 'rpc', 'web3'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
