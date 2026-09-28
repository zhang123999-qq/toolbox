import type { ToolMeta } from '@toolbox/catalog'

/**
 * tilemap —— 全局编号 #788
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'tilemap',
  slug: 'tilemap',
  title: '瓦片地图',
  description: '在画布上绘制游戏瓦片地图：多图层、矩形填充、缩放裁剪，并导出/导入地图 JSON',
  titleEn: 'Tilemap Editor',
  descriptionEn:
    'Draw game tilemaps on canvas: multi-layer, rect fill, resize, and export/import tilemap JSON',

  category: 'game',
  group: 'design',
  tags: ['game', 'tilemap', 'canvas', 'map'],

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
