import type { ToolMeta } from '@toolbox/catalog'

/**
 * video-format —— 全局编号 #581
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（纯函数魔数识别）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'video-format',
  slug: 'video-format',
  title: '视频格式识别',
  description: '读取文件头魔数识别视频格式（MP4/MOV/WebM/MKV/AVI/FLV/TS/WMV/Ogg）',
  titleEn: 'Video Format Detector',
  descriptionEn:
    'Detect video format from file header magic bytes (MP4/MOV/WebM/MKV/AVI/FLV/TS/WMV/Ogg)',

  category: 'media',
  group: 'design',
  tags: ['video', 'format', 'magic', 'detect', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
