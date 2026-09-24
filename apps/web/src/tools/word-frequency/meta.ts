import type { ToolMeta } from '@toolbox/catalog'

/**
 * word-frequency —— 全局编号 #5
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'word-frequency',
  slug: 'word-frequency',
  title: '词频统计',
  description: '统计词频并排序，支持停用词过滤',
  titleEn: 'Word Frequency',
  descriptionEn: 'Count and rank word frequency, with stop-word filtering',

  category: 'text',
  group: 'dev',
  tags: ['text', 'frequency', 'stats'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['topN', 'ignoreCase', 'useStopWords'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
