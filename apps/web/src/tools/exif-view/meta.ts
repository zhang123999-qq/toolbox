import type { ToolMeta } from '@toolbox/catalog'

/**
 * exif-view —— 全局编号 #444
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * EXIF 查看：本地用 exifr 读取图片全部 EXIF 标签，分类表格展示
 * （拍摄参数 / GPS 位置 / 文件信息 / 其他标签），全程不上传。
 */
export const meta: ToolMeta = {
  id: 'exif-view',
  slug: 'exif-view',
  title: 'EXIF 查看',
  description: '本地读取图片 EXIF 元数据：拍摄参数、GPS 位置、文件信息分类展示，全程不上传',
  titleEn: 'EXIF Viewer',
  descriptionEn:
    'Read image EXIF metadata locally: shooting params, GPS and file info in categorized tables, no upload',

  category: 'image',
  group: 'design',
  tags: ['exif', 'metadata', 'photo', 'camera', 'image'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: ['exifr'],
  worker: false,
  wasm: false,
  api: false,
}
