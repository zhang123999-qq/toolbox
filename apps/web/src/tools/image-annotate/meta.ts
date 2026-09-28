import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-annotate —— 全局编号 #480
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 图片标注：单图上传，在图上用画笔 / 直线 / 箭头 / 矩形 / 椭圆 / 文字 / 马赛克
 * 做批注；画布按原尺寸 1:1 绘制保证坐标精确；每次落笔入栈，支持 30 步撤销；
 * 导出底图 + 标注层合并后的 PNG，全程本地不上传。
 */
export const meta: ToolMeta = {
  id: 'image-annotate',
  slug: 'image-annotate',
  title: '图片标注',
  description:
    '本地图片标注：画笔、直线、箭头、矩形、椭圆、文字、马赛克批注，原尺寸 1:1，支持 30 步撤销，全程不上传',
  titleEn: 'Image Annotate',
  descriptionEn:
    'Annotate images locally: brush, line, arrow, rectangle, ellipse, text and mosaic markup at 1:1 scale, 30-step undo, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'annotate', 'markup', 'arrow'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['tool', 'color', 'lineWidth', 'fontSize', 'text'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
