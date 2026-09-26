import type { ToolMeta } from '@toolbox/catalog'

/**
 * pgp-tool —— 全局编号 #112
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 *
 * 说明：规划依赖 openpgp 做加解密 / 签名，但该库未安装且本仓库零新增网络依赖。
 * 自行用纯 TS 实现完整 OpenPGP 加密体系（CFB / 密钥派生 / 签名验证）既不安全也不现实，
 * 故本工具落地为「Paste PGP armored → 离线结构检查」：解 Radix64、校验 CRC24、
 * 解析 packet 结构 / 算法 OID。**不做加解密 / 签名 / 密钥生成**（见 README）。
 */
export const meta: ToolMeta = {
  id: 'pgp-tool',
  slug: 'pgp-tool',
  title: 'PGP 报文检查',
  description: '粘贴 OpenPGP ASCII Armor，离线解析报文类型、包头、算法与 CRC24 校验',
  titleEn: 'PGP Message Inspector',
  descriptionEn: 'Inspect OpenPGP ASCII armor offline: packets, algorithms and CRC24',

  category: 'encoding',
  group: 'dev',
  tags: ['pgp', 'openpgp', 'gpg', 'armor', 'security'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
