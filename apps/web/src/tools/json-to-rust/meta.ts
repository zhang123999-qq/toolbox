import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-rust —— 全局编号 #144
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-rust',
  slug: 'json-to-rust',
  title: 'JSON 转 Rust',
  description: '由 JSON 样本生成带 serde 派生的 Rust struct',
  titleEn: 'JSON to Rust',
  descriptionEn: 'Generate Rust structs with serde derives from a JSON sample',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'rust', 'codegen'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'style', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
