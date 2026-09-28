import type { ToolMeta } from '@toolbox/catalog'

/**
 * memory-game —— 全局编号 #850
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 翻牌配对记忆游戏：翻两张比对，同值配对消除，计步数，种子可复现牌序。
 */
export const meta: ToolMeta = {
  id: 'memory-game',
  slug: 'memory-game',
  title: '记忆游戏',
  description: '翻牌配对记忆游戏：记住牌的位置配成对，步数越少越好',
  titleEn: 'Memory Game',
  descriptionEn: 'Card matching memory game: flip pairs, fewer moves is better',

  category: 'education',
  group: 'life',
  tags: ['game', 'memory', 'cards', 'fun'],

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
