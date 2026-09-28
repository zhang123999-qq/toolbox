import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-compress —— 全局编号 #543
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（ffmpeg.wasm 本地压缩）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-compress',
  slug: 'audio-compress',
  title: '音频压缩',
  description: '用 ffmpeg.wasm 在浏览器本地压缩音频：降低比特率，减小文件体积',
  titleEn: 'Audio Compressor',
  descriptionEn: 'Compress audio locally in the browser with ffmpeg.wasm by lowering the bitrate',

  category: 'media',
  group: 'design',
  tags: ['audio', 'compress', 'bitrate', 'mp3', 'ffmpeg'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['preset', 'bitrate'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
