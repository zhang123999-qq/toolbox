import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-schema-validate —— 全局编号 #140
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-schema-validate',
  slug: 'json-schema-validate',
  title: 'JSON Schema 校验',
  description: '按 JSON Schema 校验数据，列出每条不符合项与其路径',
  titleEn: 'JSON Schema Validate',
  descriptionEn: 'Validate data against a JSON Schema and list every violation',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'schema', 'validate'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  // 双份输入：text 是待校验数据，textB 是 Schema（由 extraInputs 渲染）
  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode', 'strict'],

  // 规划表列的是 ajv；禁止新增依赖，改为自研关键字子集，缺口写在 README
  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
