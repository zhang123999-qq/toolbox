import type { ToolMeta } from '@toolbox/catalog'

/**
 * equation —— 全局编号 #341
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 方程求解：一元一次 / 一元二次 / 二元一次方程组（方程组用 mathjs lusolve 求解）
 */
export const meta: ToolMeta = {
  id: 'equation',
  slug: 'equation',
  title: '方程求解',
  description: '解一元一次、一元二次方程与二元一次方程组，输出求解步骤与结果',
  titleEn: 'Equation Solver',
  descriptionEn:
    'Solve linear, quadratic and 2×2 linear-system equations, with solution steps (systems solved with mathjs lusolve)',

  category: 'math',
  group: 'life',
  tags: ['math', 'equation', 'algebra', 'solver'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['mathjs'],
  worker: false,
  wasm: false,
  api: false,
}
