import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-convert —— 全局编号 #542
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（ffmpeg.wasm 本地转码）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-convert',
  slug: 'audio-convert',
  title: '音频格式转换',
  description: '上传音频，用 ffmpeg.wasm 在浏览器本地转换为 MP3 / WAV / OGG / M4A / FLAC 等格式',
  titleEn: 'Audio Format Converter',
  descriptionEn:
    'Convert audio files locally in the browser to MP3 / WAV / OGG / M4A / FLAC via ffmpeg.wasm',

  category: 'media',
  group: 'design',
  tags: ['audio', 'convert', 'format', 'mp3', 'ffmpeg'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['format', 'bitrate'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
