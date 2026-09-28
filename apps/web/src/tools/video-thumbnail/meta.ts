import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-thumbnail —— 全局编号 #576
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（video 逐帧跳转 + canvas 截取）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-thumbnail',
  slug: 'video-thumbnail',
  title: '视频缩略图',
  description: '在多个时间点截取视频帧，生成缩略图网格预览，可单张导出 PNG',
  titleEn: 'Video Thumbnails',
  descriptionEn:
    'Capture video frames at multiple timestamps into a thumbnail grid, exportable as individual PNGs',

  category: 'media',
  group: 'design',
  tags: ['video', 'thumbnail', 'frame', 'capture', 'png'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['image'],
  options: ['timestamps', 'columns'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
