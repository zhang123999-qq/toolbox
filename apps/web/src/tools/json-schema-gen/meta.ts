import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-schema-gen —— 全局编号 #139
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-schema-gen',
  slug: 'json-schema-gen',
  title: 'JSON Schema 生成',
  description: '从 JSON 样本反推 JSON Schema（draft-07 / 2020-12）',
  titleEn: 'JSON Schema Generator',
  descriptionEn: 'Infer a JSON Schema draft from a sample document',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'schema', 'generate'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['format', 'strict'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
