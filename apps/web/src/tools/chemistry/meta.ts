import type { ToolMeta } from '@toolbox/catalog'

/**
 * chemistry —— 全局编号 #823
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'chemistry',
  slug: 'chemistry',
  title: '化学方程式',
  description: '化学方程式配平、化学式解析与摩尔质量计算（纯前端，无需联网）',
  titleEn: 'Chemistry Equation',
  descriptionEn:
    'Balance chemical equations, parse formulas and compute molar mass (pure frontend, offline)',

  category: 'education',
  group: 'life',
  tags: ['chemistry', 'equation', 'molar-mass', 'education'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
