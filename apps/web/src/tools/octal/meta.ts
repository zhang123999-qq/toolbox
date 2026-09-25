import type { ToolMeta } from '@toolbox/catalog'

/**
 * octal —— 全局编号 #84
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'octal',
  slug: 'octal',
  title: '八进制转换',
  description: '文本与八进制转义互转，支持按字符或按字节切分',
  titleEn: 'Octal Converter',
  descriptionEn: 'Convert text to and from octal escapes, per character or per byte',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'octal', 'codec'],

  priority: 'P1',
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
