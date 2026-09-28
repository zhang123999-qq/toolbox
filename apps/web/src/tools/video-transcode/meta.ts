import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-transcode —— 全局编号 #566
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 本地转码）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-transcode',
  slug: 'video-transcode',
  title: '视频转码',
  description: '上传视频，用 ffmpeg.wasm 在浏览器本地转换容器 / 编码 / 分辨率',
  titleEn: 'Video Transcoder',
  descriptionEn:
    'Transcode videos locally in the browser: container, codec and resolution via ffmpeg.wasm',

  category: 'media',
  group: 'design',
  tags: ['video', 'transcode', 'container', 'codec', 'ffmpeg'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['video'],
  options: ['format', 'resolution'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
