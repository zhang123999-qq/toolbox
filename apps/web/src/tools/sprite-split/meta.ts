import type { ToolMeta } from '@toolbox/catalog'

/**
 * sprite-split —— 全局编号 #786
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sprite-split',
  slug: 'sprite-split',
  title: '精灵图切割',
  description: '按行列/边距/间距切割游戏精灵图（雪碧图），计算每帧坐标并逐帧导出 PNG',
  titleEn: 'Sprite Sheet Splitter',
  descriptionEn:
    'Split game sprite sheets by rows, columns, margin and spacing; compute frame rects and export each frame as PNG',

  category: 'game',
  group: 'design',
  tags: ['game', 'sprite', 'pixel-art', 'canvas'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text'],
  outputs: ['file', 'text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
