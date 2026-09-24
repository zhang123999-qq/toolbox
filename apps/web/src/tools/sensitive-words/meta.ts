import type { ToolMeta } from '@toolbox/catalog'

/**
 * sensitive-words —— 全局编号 #7
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'sensitive-words',
  slug: 'sensitive-words',
  title: '敏感词检测',
  description: '本地词库匹配敏感词并高亮',
  titleEn: 'Sensitive Words',
  descriptionEn: 'Match sensitive words against a local list and highlight them',

  category: 'text',
  group: 'dev',
  tags: ['text', 'filter', 'detect'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mask'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
