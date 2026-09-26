import type { ToolMeta } from '@toolbox/catalog'

/**
 * jsonl —— 全局编号 #150
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'jsonl',
  slug: 'jsonl',
  title: 'JSON Lines',
  description: 'JSONL / NDJSON 处理：解析成数组、由数组生成、逐行校验',
  titleEn: 'JSON Lines',
  descriptionEn: 'Parse, generate and validate JSON Lines (NDJSON) documents',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'jsonl', 'ndjson'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'skipEmpty'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
