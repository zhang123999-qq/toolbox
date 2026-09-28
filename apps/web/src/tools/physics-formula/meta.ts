import type { ToolMeta } from '@toolbox/catalog'

/**
 * physics-formula —— 全局编号 #822
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'physics-formula',
  slug: 'physics-formula',
  title: '物理公式',
  description: '中学物理公式速查与代入计算：力学 / 电学 / 热学 15 条公式，非游戏物理模拟',
  titleEn: 'Physics Formulas',
  descriptionEn:
    'Look up physics formulas and compute by substitution: 15 mechanics / electricity / thermodynamics formulas',

  category: 'education',
  group: 'life',
  tags: ['physics', 'formula', 'education', 'calculator'],

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
