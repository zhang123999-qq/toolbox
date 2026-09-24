import type { ToolMeta } from '@toolbox/catalog'

/**
 * shuffle —— 全局编号 #27
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'shuffle',
  slug: 'shuffle',
  title: '文本乱序',
  description: '按行、按词随机打乱',
  titleEn: 'Shuffle Text',
  descriptionEn: 'Randomly shuffle lines or words',

  category: 'text',
  group: 'dev',
  tags: ['text', 'shuffle', 'random'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'stable'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
