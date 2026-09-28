import type { ToolMeta } from '@toolbox/catalog'

/**
 * math-formula —— 全局编号 #824
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'math-formula',
  slug: 'math-formula',
  title: '数学公式',
  description: '数学公式速查与代入计算：代数、几何、三角共 14 条（非物理公式）',
  titleEn: 'Math Formulas',
  descriptionEn:
    'Look up math formulas and compute by substitution: 14 algebra/geometry/trigonometry formulas (not physics)',

  category: 'education',
  group: 'life',
  tags: ['math', 'formula', 'education', 'geometry'],

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
