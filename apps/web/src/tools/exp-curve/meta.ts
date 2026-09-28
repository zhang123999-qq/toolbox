import type { ToolMeta } from '@toolbox/catalog'

/**
 * exp-curve —— 全局编号 #805
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'exp-curve',
  slug: 'exp-curve',
  title: '经验曲线',
  description: '等级经验曲线：线性/指数升级所需经验表，支持由累计经验反查等级',
  titleEn: 'EXP Curve',
  descriptionEn:
    'Level EXP curves: linear/exponential per-level tables with cumulative totals, reverse lookup level by total EXP',

  category: 'game',
  group: 'design',
  tags: ['game', 'exp', 'level', 'curve'],

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
