import type { ToolMeta } from '@toolbox/catalog'

/**
 * vision —— 全局编号 #853
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 眼力测试：在 n×n 色块阵中找出颜色不同的那一块，难度随等级递增。
 */
export const meta: ToolMeta = {
  id: 'vision',
  slug: 'vision',
  title: '眼力测试',
  description: '眼力大挑战：在色块阵中找出颜色不同的那一块，等级越高色差越小',
  titleEn: 'Vision Test',
  descriptionEn: 'Find the odd-colored tile in the grid; higher levels, subtler differences',

  category: 'education',
  group: 'life',
  tags: ['game', 'vision', 'color', 'test', 'fun'],

  priority: 'P2',
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
