import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-go —— 全局编号 #142
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-go',
  slug: 'json-to-go',
  title: 'JSON 转 Go',
  description: '由 JSON 样本生成 Go 结构体，字段导出并带 json tag',
  titleEn: 'JSON to Go',
  descriptionEn: 'Generate Go structs with exported fields and json tags from a JSON sample',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'go', 'codegen'],

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
