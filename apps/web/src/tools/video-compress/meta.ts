import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-compress —— 全局编号 #560
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 本地压缩）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-compress',
  slug: 'video-compress',
  title: '视频压缩',
  description: '上传视频，用 ffmpeg.wasm 在浏览器本地降低码率 / 分辨率压缩体积',
  titleEn: 'Video Compressor',
  descriptionEn:
    'Compress videos locally in the browser by lowering bitrate and resolution via ffmpeg.wasm',

  category: 'media',
  group: 'design',
  tags: ['video', 'compress', 'bitrate', 'ffmpeg', 'media'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['video'],
  options: ['quality', 'resolution'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
