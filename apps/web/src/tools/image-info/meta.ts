import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-info —— 全局编号 #467
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片元信息：本地读取图片基础信息（文件名、大小、尺寸、宽高比、百万像素、
 * 色彩空间），并按文件头魔数识别实际格式；声明类型与实际格式不一致时给出警告。
 * 与 exif-view（#445）不同：本工具不读取 EXIF，只做基础信息 + 魔数识别。
 */
export const meta: ToolMeta = {
  id: 'image-info',
  slug: 'image-info',
  title: '图片元信息',
  description:
    '本地查看图片基础元信息：尺寸、宽高比、文件头魔数识别实际格式，不读 EXIF，全程不上传',
  titleEn: 'Image Info',
  descriptionEn:
    'Inspect basic image metadata locally: dimensions, aspect ratio, real format via file-header magic, no EXIF, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'info', 'metadata'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
