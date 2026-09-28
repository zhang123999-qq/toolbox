import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-cut —— 全局编号 #567
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（ffmpeg.wasm 本地转码）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-cut',
  slug: 'video-cut',
  title: '视频裁剪',
  description: '上传视频，按起止时间裁剪出片段并导出，可选重编码以保证兼容性',
  titleEn: 'Video Cut',
  descriptionEn: 'Trim a video clip by start/end time and export it, with optional re-encoding',

  category: 'media',
  group: 'design',
  tags: ['video', 'cut', 'trim', 'ffmpeg', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['video'],
  options: ['start', 'end', 'reencode'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
