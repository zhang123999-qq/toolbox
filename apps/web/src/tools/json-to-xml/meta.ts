import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-xml —— 全局编号 #148
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-xml',
  slug: 'json-to-xml',
  title: 'JSON 转 XML',
  description: '把 JSON 对象转成结构清晰的 XML',
  titleEn: 'JSON to XML',
  descriptionEn: 'Convert a JSON object into well-structured XML',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'xml', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['rootName', 'declaration', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
