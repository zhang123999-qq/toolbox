import type { ToolMeta } from '@toolbox/catalog'

/**
 * subtitle-extract —— 全局编号 #582
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 本地提取字幕）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'subtitle-extract',
  slug: 'subtitle-extract',
  title: '字幕提取',
  description: '上传视频，用 ffmpeg.wasm 在浏览器本地提取内嵌字幕流，导出 SRT/VTT/ASS',
  titleEn: 'Subtitle Extractor',
  descriptionEn:
    'Extract embedded subtitle streams from a video locally in the browser via ffmpeg.wasm, export as SRT/VTT/ASS',

  category: 'media',
  group: 'design',
  tags: ['video', 'subtitle', 'srt', 'vtt', 'ass'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['format'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
