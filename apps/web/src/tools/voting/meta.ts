import type { ToolMeta } from '@toolbox/catalog'

/**
 * voting —— 全局编号 #413
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 投票：多选项投票统计，纯本地 state 实现，无后端；结果仅保存在本页，刷新丢失
 */
export const meta: ToolMeta = {
  id: 'voting',
  slug: 'voting',
  title: '投票',
  description: '多选项投票统计：点击选项即投票，实时显示票数与占比；结果仅保存在本页，刷新丢失',
  titleEn: 'Voting',
  descriptionEn:
    'Multi-option voting with live counts and percentages; results live only on this page and are lost on refresh',

  category: 'random',
  group: 'design',
  tags: ['voting', 'poll', 'stats', 'choice'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
