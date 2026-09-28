import type { ToolMeta } from '@toolbox/catalog'

/**
 * tetris —— 全局编号 #846
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 俄罗斯方块：7 种四联方块下落，方向键移动旋转，满行消除计分，逻辑为纯函数。
 */
export const meta: ToolMeta = {
  id: 'tetris',
  slug: 'tetris',
  title: '俄罗斯方块',
  description: '经典俄罗斯方块：移动旋转下落方块，满行消除计分',
  titleEn: 'Tetris',
  descriptionEn: 'Classic Tetris: move and rotate falling tetrominoes, clear lines to score',

  category: 'education',
  group: 'life',
  tags: ['game', 'tetris', 'puzzle', 'classic'],

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
