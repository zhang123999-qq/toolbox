import type { ToolMeta } from '@toolbox/catalog'

/**
 * mini-game —— 全局编号 #842
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 打地鼠小游戏：9 宫格随机冒出地鼠，限时 30 秒敲击得分，游戏逻辑为纯函数。
 */
export const meta: ToolMeta = {
  id: 'mini-game',
  slug: 'mini-game',
  title: '小游戏',
  description: '打地鼠：限时敲击随机冒出的地鼠，按命中数计分',
  titleEn: 'Whack-a-Mole',
  descriptionEn: 'Whack-a-mole mini game: hit randomly popping moles before time runs out',

  category: 'education',
  group: 'life',
  tags: ['game', 'whack-a-mole', 'fun', 'reaction'],

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
