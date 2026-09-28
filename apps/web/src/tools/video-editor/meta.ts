import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-editor —— 全局编号 #585
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ffmpeg.wasm 裁剪拼接）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-editor',
  slug: 'video-editor',
  title: '视频剪辑',
  description: '设定多个片段的起止时间并排序，用 ffmpeg.wasm 裁剪拼接后导出视频',
  titleEn: 'Video Editor',
  descriptionEn:
    'Set start/end times for multiple segments, reorder them, and export the joined video',

  category: 'media',
  group: 'design',
  tags: ['video', 'cut', 'trim', 'concat', 'ffmpeg'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['video'],
  options: ['segments'],

  deps: ['@ffmpeg/ffmpeg'],
  worker: false,
  wasm: true,
  api: false,
}
