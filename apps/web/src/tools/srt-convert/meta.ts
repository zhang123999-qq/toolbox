import type { ToolMeta } from '@toolbox/catalog'

/**
 * srt-convert —— 全局编号 #562
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：A（纯 JS 字幕解析）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'srt-convert',
  slug: 'srt-convert',
  title: 'SRT字幕转换',
  description: '解析 SRT 字幕，转换为纯文本 / JSON / VTT，并支持时间轴整体偏移',
  titleEn: 'SRT Converter',
  descriptionEn:
    'Parse SRT subtitles and convert to plain text / JSON / VTT, with timeline shifting',

  category: 'media',
  group: 'design',
  tags: ['subtitle', 'srt', 'vtt', 'convert', 'media'],

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
