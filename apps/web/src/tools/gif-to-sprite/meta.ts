import type { ToolMeta } from '@toolbox/catalog'

/**
 * gif-to-sprite —— 全局编号 #798
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：C（WebCodecs ImageDecoder）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'gif-to-sprite',
  slug: 'gif-to-sprite',
  title: 'GIF 转精灵图',
  description: '用浏览器 WebCodecs ImageDecoder 逐帧解码 GIF，按列数拼成雪碧图并导出 PNG',
  titleEn: 'GIF to Sprite Sheet',
  descriptionEn:
    'Decode GIF frame by frame with the browser WebCodecs ImageDecoder, pack into a sprite sheet and export PNG',

  category: 'game',
  group: 'design',
  tags: ['game', 'gif', 'sprite', 'webcodecs'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['file', 'text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
