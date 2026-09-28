import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-frame —— 全局编号 #558
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（video seek + canvas 抓帧）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-frame',
  slug: 'video-frame',
  title: '视频截图',
  description: '视频指定时间点抓帧，导出 PNG 图片',
  titleEn: 'Video Frame Capture',
  descriptionEn: 'Capture a video frame at a given timestamp and export as PNG',

  category: 'media',
  group: 'design',
  tags: ['video', 'frame', 'screenshot', 'png', 'capture'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['video'],
  outputs: ['image'],
  options: ['time'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
