import type { ToolMeta } from '@toolbox/catalog'

/**
 * pixel-art —— 全局编号 #789
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pixel-art',
  slug: 'pixel-art',
  title: '像素画',
  description: '在像素画布上绘制像素画：画笔/直线/洪水填充/镜像，导出 PNG 与颜色统计',
  titleEn: 'Pixel Art Editor',
  descriptionEn:
    'Draw pixel art on a pixel canvas: brush, line, flood fill, mirror; export PNG and color stats',

  category: 'game',
  group: 'design',
  tags: ['game', 'pixel-art', 'canvas', 'drawing'],

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
