import type { ToolMeta } from '@toolbox/catalog'

/**
 * hex —— 全局编号 #82
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'hex',
  slug: 'hex',
  title: 'Hex 编解码',
  description: '文本与十六进制互转，支持空格 / 连字符 / 0x 前缀',
  titleEn: 'Hex Encode / Decode',
  descriptionEn: 'Convert text to and from hex, with configurable separators',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'hex', 'codec'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'separator', 'uppercase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
