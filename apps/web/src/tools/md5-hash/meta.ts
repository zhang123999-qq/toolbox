import type { ToolMeta } from '@toolbox/catalog'

/**
 * md5-hash —— 全局编号 #117
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'md5-hash',
  slug: 'md5-hash',
  title: 'MD5 哈希',
  description: '计算文本的 MD5 摘要，支持大小写与 Base64 输出',
  titleEn: 'MD5 Hash',
  descriptionEn: 'Compute the MD5 digest of a text',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'md5', 'hash', 'checksum'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['uppercase', 'format'],

  deps: ['spark-md5'],
  worker: false,
  wasm: false,
  api: false,
}
