import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-diff —— 全局编号 #136
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-diff',
  slug: 'json-diff',
  title: 'JSON Diff',
  description: '两份 JSON 的差异对比，支持按键归一化与行级/字符级粒度',
  titleEn: 'JSON Diff',
  descriptionEn: 'Compare two JSON documents at line or character level',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'diff', 'compare'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  // 双份输入：text 是改动前，textB 是改动后（textB 由 extraInputs 渲染）
  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode', 'sortKeys'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}
