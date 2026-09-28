import type { ToolMeta } from '@toolbox/catalog'

/**
 * svg-game —— 全局编号 #795
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'svg-game',
  slug: 'svg-game',
  title: 'SVG 游戏资源',
  description:
    '游戏精灵（角色/道具/地形）SVG 模板库：8 种预设精灵，支持主/副配色参数化替换并导出，非通用图案生成',
  titleEn: 'SVG Game Sprites',
  descriptionEn:
    'Game sprite (character/item/terrain) SVG template library: 8 preset sprites with primary/secondary color parameters, exportable; not a generic pattern generator',

  category: 'game',
  group: 'design',
  tags: ['game', 'svg', 'sprite', 'template'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['file', 'text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
