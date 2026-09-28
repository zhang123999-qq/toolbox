import type { ToolMeta } from '@toolbox/catalog'

/**
 * ass-convert —— 全局编号 #564
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：A（纯 JS 字幕解析）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ass-convert',
  slug: 'ass-convert',
  title: 'ASS字幕转换',
  description:
    '解析 ASS / SSA 字幕（样式段可保留或丢弃），转换为纯文本 / JSON / SRT，并支持时间轴偏移',
  titleEn: 'ASS Converter',
  descriptionEn:
    'Parse ASS / SSA subtitles (styles kept or dropped) and convert to text / JSON / SRT with shifting',

  category: 'media',
  group: 'design',
  tags: ['subtitle', 'ass', 'ssa', 'srt', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['target', 'offset', 'keepStyles'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
