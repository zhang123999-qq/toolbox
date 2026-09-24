import type { ToolMeta } from '@toolbox/catalog'

/**
 * reading-time —— 全局编号 #3
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'reading-time',
  slug: 'reading-time',
  title: '阅读时间',
  description: '按字数估算阅读时长',
  titleEn: 'Reading Time',
  descriptionEn: 'Estimate reading time from word count',

  category: 'text',
  group: 'dev',
  tags: ['text', 'reading', 'estimate'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['speed'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
