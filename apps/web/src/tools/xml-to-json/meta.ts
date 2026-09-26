import type { ToolMeta } from '@toolbox/catalog'

/**
 * xml-to-json —— 全局编号 #159
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'xml-to-json',
  slug: 'xml-to-json',
  title: 'XML 转 JSON',
  description: '把 XML 转成 JSON，属性前缀、文本节点键名与数组归一策略可配',
  titleEn: 'XML to JSON',
  descriptionEn: 'Convert XML to JSON with configurable attribute prefix, text key and array rules',

  category: 'data-format',
  group: 'dev',
  tags: ['xml', 'json', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['prefix', 'mode', 'textKey', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
