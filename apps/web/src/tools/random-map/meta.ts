import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-map —— 全局编号 #792
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'random-map',
  slug: 'random-map',
  title: '随机地图',
  description: '用可复现随机种子生成游戏地形图：水域/陆地/山地，细胞自动机平滑，ASCII 与画布预览',
  titleEn: 'Random Map Generator',
  descriptionEn:
    'Generate game terrain maps from a reproducible seed: water/land/mountain with cellular-automata smoothing, ASCII and canvas preview',

  category: 'game',
  group: 'design',
  tags: ['game', 'map', 'random', 'terrain'],

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
