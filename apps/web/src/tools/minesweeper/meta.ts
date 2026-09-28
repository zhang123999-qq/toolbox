import type { ToolMeta } from '@toolbox/catalog'

/**
 * minesweeper —— 全局编号 #845
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 扫雷：点击揭开格子、右键插旗，空白格泛洪展开，布雷用可复现种子。
 */
export const meta: ToolMeta = {
  id: 'minesweeper',
  slug: 'minesweeper',
  title: '扫雷',
  description: '经典扫雷：左键揭开、右键插旗，揭开全部安全格获胜',
  titleEn: 'Minesweeper',
  descriptionEn: 'Classic minesweeper: reveal cells, flag mines, clear all safe cells to win',

  category: 'education',
  group: 'life',
  tags: ['game', 'minesweeper', 'puzzle', 'classic'],

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
