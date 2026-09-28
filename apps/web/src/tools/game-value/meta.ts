import type { ToolMeta } from '@toolbox/catalog'

/**
 * game-value —— 全局编号 #802
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'game-value',
  slug: 'game-value',
  title: '游戏数值',
  description: '游戏属性成长公式计算：线性/指数/分段拐点，生成 1..N 级成长表',
  titleEn: 'Game Value Growth',
  descriptionEn:
    'Compute game stat growth: linear/exponential/piecewise breakpoints, generate level 1..N growth tables',

  category: 'game',
  group: 'design',
  tags: ['game', 'stats', 'growth', 'balance'],

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
