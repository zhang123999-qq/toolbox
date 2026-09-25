import type { ToolMeta } from '@toolbox/catalog'

/**
 * base85-codec —— 全局编号 #74
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'base85-codec',
  slug: 'base85-codec',
  title: 'Base85 编解码',
  description: 'ASCII85 与 Z85 编解码，比 Base64 更紧凑',
  titleEn: 'Base85 Encode / Decode',
  descriptionEn: 'ASCII85 and Z85 encode and decode',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'base85', 'ascii85', 'z85', 'codec'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
