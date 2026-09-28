import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-round —— 全局编号 #429
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 圆角图片：本地 Canvas 圆角矩形 / 圆形裁剪，可选透明 / 白色 / 自定义背景，
 * PNG 保留透明通道，JPEG 固定最高质量，全程不上传。
 */
export const meta: ToolMeta = {
  id: 'image-round',
  slug: 'image-round',
  title: '圆角图片',
  description: '本地给图片加圆角或裁成圆形：透明/白色/自定义背景，PNG 保透明，全程不上传',
  titleEn: 'Round Image Corners',
  descriptionEn:
    'Round image corners or crop to a circle locally: transparent/white/custom background, PNG keeps transparency, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'round', 'corner', 'circle', 'avatar'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['mode', 'radius', 'radiusUnit', 'background', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
