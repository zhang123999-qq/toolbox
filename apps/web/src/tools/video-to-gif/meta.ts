import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-to-gif —— 全局编号 #559
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 本地转码）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-to-gif',
  slug: 'video-to-gif',
  title: '视频转GIF',
  description: '上传视频，用 ffmpeg.wasm 在浏览器本地截取片段并转换为 GIF 动图',
  titleEn: 'Video to GIF',
  descriptionEn: 'Extract a video clip and convert it to an animated GIF locally via ffmpeg.wasm',

  category: 'media',
  group: 'design',
  tags: ['video', 'gif', 'convert', 'ffmpeg', 'media'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['image'],
  options: ['start', 'duration', 'fps', 'width'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
