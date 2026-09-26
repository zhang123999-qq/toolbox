import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-hash —— 全局编号 #125
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'file-hash',
  slug: 'file-hash',
  title: '文件哈希',
  description: '计算文件或文本的 MD5 / SHA-1 / SHA-256 / SHA-512 摘要，用于校验完整性',
  titleEn: 'File Hash',
  descriptionEn: 'Compute MD5 / SHA-1 / SHA-256 / SHA-512 digests of a file or text',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'hash', 'file', 'md5', 'sha256'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'file'],
  outputs: ['text'],
  options: ['algorithm', 'format'],

  deps: ['spark-md5'],
  worker: false,
  wasm: false,
  api: false,
}
