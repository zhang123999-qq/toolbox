import type { ToolMeta } from '@toolbox/catalog'

/**
 * screen-recorder —— 全局编号 #569
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（浏览器原生录屏 API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'screen-recorder',
  slug: 'screen-recorder',
  title: '屏幕录制',
  description: '用浏览器录制屏幕 / 窗口 / 标签页，录完可预览并导出 webm 视频',
  titleEn: 'Screen Recorder',
  descriptionEn: 'Record screen, window, or tab with the browser and export as webm',

  category: 'media',
  group: 'design',
  tags: ['screen', 'record', 'capture', 'webm', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: [],
  outputs: ['video'],
  options: ['withAudio'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
