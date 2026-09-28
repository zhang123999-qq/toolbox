import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-extract —— 全局编号 #548
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（ffmpeg.wasm 本地提取音轨）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-extract',
  slug: 'audio-extract',
  title: '视频提取音频',
  description: '上传视频，用 ffmpeg.wasm 在浏览器本地提取音轨并导出为音频文件',
  titleEn: 'Extract Audio from Video',
  descriptionEn: 'Extract the audio track from a video locally in the browser via ffmpeg.wasm',

  category: 'media',
  group: 'design',
  tags: ['audio', 'extract', 'video', 'track', 'ffmpeg'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['format'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
