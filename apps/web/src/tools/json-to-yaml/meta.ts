import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-yaml —— 全局编号 #147
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-yaml',
  slug: 'json-to-yaml',
  title: 'JSON 转 YAML',
  description: '把 JSON 转成可读的 YAML，纯本地序列化',
  titleEn: 'JSON to YAML',
  descriptionEn: 'Convert JSON to readable YAML, serialized entirely in the browser',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'yaml', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['indent', 'quote'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
