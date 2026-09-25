import type { ToolMeta } from '@toolbox/catalog'

/**
 * xml-escape —— 全局编号 #81
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'xml-escape',
  slug: 'xml-escape',
  title: 'XML 转义',
  description: 'XML 五个预定义实体与数字实体转义，可选 CDATA 段',
  titleEn: 'XML Escape',
  descriptionEn: 'Escape text for XML with predefined entities, numeric refs or CDATA',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'xml', 'escape'],

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
