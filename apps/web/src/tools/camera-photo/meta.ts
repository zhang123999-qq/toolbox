import type { ToolMeta } from '@toolbox/catalog'

/**
 * camera-photo —— 全局编号 #570
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（浏览器原生摄像头 API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'camera-photo',
  slug: 'camera-photo',
  title: '摄像头拍照',
  description: '打开摄像头预览，一键拍照并导出 PNG 图片',
  titleEn: 'Camera Photo',
  descriptionEn: 'Preview the camera, take a snapshot and export it as PNG',

  category: 'media',
  group: 'design',
  tags: ['camera', 'photo', 'snapshot', 'png', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: [],
  outputs: ['image'],
  options: ['maxSide'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
