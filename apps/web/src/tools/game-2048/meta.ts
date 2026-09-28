import type { ToolMeta } from '@toolbox/catalog'

/**
 * game-2048 —— 全局编号 #844
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 2048：方向键滑动棋盘合并相同数字砖块，目标合成 2048，滑动合并为纯函数。
 * slug 取 game-2048，避免纯数字 slug。
 */
export const meta: ToolMeta = {
  id: 'game-2048',
  slug: 'game-2048',
  title: '2048',
  description: '经典 2048：滑动合并相同数字，目标合成 2048',
  titleEn: '2048',
  descriptionEn: 'Classic 2048: slide and merge tiles to reach 2048',

  category: 'education',
  group: 'life',
  tags: ['game', '2048', 'puzzle', 'classic'],

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
