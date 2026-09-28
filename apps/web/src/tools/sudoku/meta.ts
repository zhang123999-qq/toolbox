import type { ToolMeta } from '@toolbox/catalog'

/**
 * sudoku —— 全局编号 #848
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 数独生成/求解/校验：种子可复现的题目生成（挖空保证唯一解）、回溯求解、行列宫校验。
 */
export const meta: ToolMeta = {
  id: 'sudoku',
  slug: 'sudoku',
  title: '数独',
  description: '数独生成、求解与校验：三种难度，种子可复现，挖空保证唯一解',
  titleEn: 'Sudoku',
  descriptionEn: 'Sudoku generator, solver and validator: 3 difficulties, seeded, unique solution',

  category: 'education',
  group: 'life',
  tags: ['game', 'sudoku', 'puzzle', 'logic'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
