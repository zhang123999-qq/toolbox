import type { ToolMeta } from '@toolbox/catalog'

/**
 * subtitle-merge —— 全局编号 #565
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：A（纯 JS 字幕解析）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'subtitle-merge',
  slug: 'subtitle-merge',
  title: '字幕合并',
  description: '合并多个 SRT / VTT / ASS 字幕文件：按时间轴排序、去重、去重叠，可整体偏移',
  titleEn: 'Subtitle Merger',
  descriptionEn:
    'Merge multiple SRT / VTT / ASS subtitle files: sort by timeline, dedupe, de-overlap, shift',

  category: 'media',
  group: 'design',
  tags: ['subtitle', 'merge', 'srt', 'vtt', 'ass'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text'],
  outputs: ['text'],
  options: ['format', 'offset'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
