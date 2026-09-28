import type { ToolMeta } from '@toolbox/catalog'

/**
 * loot —— 全局编号 #803
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'loot',
  slug: 'loot',
  title: '随机掉落',
  description: '按权重抽取随机掉落（支持数量区间），可模拟 N 次统计掉落分布',
  titleEn: 'Loot Drop Simulator',
  descriptionEn:
    'Weighted random loot rolls (with quantity ranges); simulate N rolls to see drop distribution',

  category: 'game',
  group: 'design',
  tags: ['game', 'loot', 'random', 'gacha'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
