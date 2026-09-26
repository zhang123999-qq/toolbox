import type { ToolMeta } from '@toolbox/catalog'

/**
 * xml-formatter —— 全局编号 #158
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'xml-formatter',
  slug: 'xml-formatter',
  title: 'XML 格式化',
  description: 'XML 美化缩进与压缩成单行，并校验是否良构',
  titleEn: 'XML Formatter',
  descriptionEn: 'Pretty-print or minify XML and check whether it is well-formed',

  category: 'data-format',
  group: 'dev',
  tags: ['xml', 'format', 'minify'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
