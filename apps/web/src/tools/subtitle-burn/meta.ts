import type { ToolMeta } from '@toolbox/catalog'

/**
 * subtitle-burn —— 全局编号 #583
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 烧录）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'subtitle-burn',
  slug: 'subtitle-burn',
  title: '字幕烧录',
  description: '上传视频与 SRT/VTT 字幕，用 ffmpeg.wasm 把字幕烧录进画面并导出视频',
  titleEn: 'Subtitle Burn-in',
  descriptionEn: 'Burn SRT/VTT subtitles into a video with ffmpeg.wasm and export the result',

  category: 'media',
  group: 'design',
  tags: ['video', 'subtitle', 'srt', 'vtt', 'ffmpeg'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['video'],
  options: ['fontSize', 'fontColor', 'position'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
