import type { ToolMeta } from '@toolbox/catalog'

/**
 * checksum —— 全局编号 #126
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'checksum',
  slug: 'checksum',
  title: '校验和',
  description: '多种校验和算法：累加和、异或、补码、Luhn',
  titleEn: 'Checksum',
  descriptionEn: 'Checksum algorithms: sum, XOR, complement and Luhn',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'checksum', 'sum', 'xor', 'luhn'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['algorithm', 'uppercase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
