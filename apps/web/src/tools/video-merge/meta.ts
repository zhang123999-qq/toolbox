import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-merge —— 全局编号 #568
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（ffmpeg.wasm 本地转码）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-merge',
  slug: 'video-merge',
  title: '视频合并',
  description: '把多个视频按顺序拼接成一个 MP4，编码不一致时可一键重编码统一',
  titleEn: 'Video Merger',
  descriptionEn: 'Concatenate multiple videos in order into one MP4, with optional re-encoding',

  category: 'media',
  group: 'design',
  tags: ['video', 'merge', 'concat', 'ffmpeg', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['video'],
  options: ['reencode'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
