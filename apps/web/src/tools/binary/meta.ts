import type { ToolMeta } from '@toolbox/catalog'

/**
 * binary —— 全局编号 #83
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'binary',
  slug: 'binary',
  title: '二进制转换',
  description: '二进制、八进制、十进制、十六进制互转，支持任意长度整数',
  titleEn: 'Binary Converter',
  descriptionEn: 'Convert between binary, octal, decimal and hex with arbitrary precision',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'binary', 'radix'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['source', 'target', 'separator'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
