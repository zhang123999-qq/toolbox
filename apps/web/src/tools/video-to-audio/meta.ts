import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-to-audio —— 全局编号 #561
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 本地提取）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-to-audio',
  slug: 'video-to-audio',
  title: '视频转音频',
  description: '上传视频，用 ffmpeg.wasm 在浏览器本地提取音轨，导出为 MP3 / WAV 等音频',
  titleEn: 'Video to Audio',
  descriptionEn:
    'Extract the audio track from a video locally via ffmpeg.wasm, export as MP3 / WAV audio',

  category: 'media',
  group: 'design',
  tags: ['video', 'audio', 'extract', 'mp3', 'ffmpeg'],

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
