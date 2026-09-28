import type { ToolMeta } from '@toolbox/catalog'

/**
 * public-key —— 全局编号 #693
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：C｜模板：T3
 * secp256k1 公钥生成：私钥 → 压缩/非压缩公钥 + 以太坊地址（纯前端椭圆曲线运算） */
export const meta: ToolMeta = {
  id: 'public-key',
  slug: 'public-key',
  title: '公钥生成',
  description: '由 secp256k1 私钥推导公钥：压缩/非压缩两种格式，并计算对应以太坊地址',
  titleEn: 'Public Key Generator',
  descriptionEn: 'Derive secp256k1 public keys from a private key: compressed/uncompressed formats plus the Ethereum address',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'secp256k1', 'public-key', 'address', 'web3'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
