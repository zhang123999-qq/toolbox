import type { ToolMeta } from '@toolbox/catalog'

/**
 * vtt-convert —— 全局编号 #563
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：A（纯 JS 字幕解析）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'vtt-convert',
  slug: 'vtt-convert',
  title: 'VTT字幕转换',
  description: '解析 VTT 字幕，转换为纯文本 / JSON / SRT，并支持时间轴整体偏移',
  titleEn: 'VTT Converter',
  descriptionEn:
    'Parse VTT subtitles and convert to plain text / JSON / SRT, with timeline shifting',

  category: 'media',
  group: 'design',
  tags: ['subtitle', 'vtt', 'srt', 'convert', 'media'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['target', 'offset'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
