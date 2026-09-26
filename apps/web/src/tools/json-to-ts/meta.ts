import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-ts —— 全局编号 #141
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-ts',
  slug: 'json-to-ts',
  title: 'JSON 转 TypeScript',
  description: '由 JSON 样本生成 TypeScript 接口或类型别名',
  titleEn: 'JSON to TypeScript',
  descriptionEn: 'Generate TypeScript interfaces or type aliases from a JSON sample',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'typescript', 'codegen'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'mode', 'style', 'strict', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
