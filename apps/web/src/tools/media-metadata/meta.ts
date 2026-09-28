import type { ToolMeta } from '@toolbox/catalog'

/**
 * media-metadata —— 全局编号 #574
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（纯 JS 解析 + 浏览器 API 兜底）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'media-metadata',
  slug: 'media-metadata',
  title: '媒体元数据',
  description: '读取音视频文件的元信息：格式、时长、编码、分辨率、码率等，纯本地解析',
  titleEn: 'Media Metadata',
  descriptionEn: 'Read media file metadata: format, duration, codec, resolution, bitrate',

  category: 'media',
  group: 'design',
  tags: ['metadata', 'media', 'audio', 'video', 'info'],

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
