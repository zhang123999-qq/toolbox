import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-compare —— 全局编号 #449
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片对比：上传两张图做像素级差异对比。side 模式并排显示；diff 模式以图 A
 * 尺寸为基准、把图 B 等比缩放到同尺寸后逐像素比较 RGB 差值，任一通道差值
 * 超过阈值的像素标红半透明叠加，并统计差异像素数与占比。全程本地 Canvas，
 * 不上传。
 * 与「图片对比滑块」（image-slider，#479）的区别：#449 做像素级差异计算，
 * 输出并排视图与差异热力图等分析结果；#479 只提供拖拽滑块的直观视觉对比，
 * 不做任何像素计算。
 */
export const meta: ToolMeta = {
  id: 'image-compare',
  slug: 'image-compare',
  title: '图片对比',
  description: '两张图片像素级差异对比：并排显示或差异热力图，阈值可调，全程不上传',
  titleEn: 'Image Compare',
  descriptionEn:
    'Pixel-level comparison of two images: side-by-side view or diff heatmap, adjustable threshold, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'compare', 'diff'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['image'],
  options: ['mode', 'threshold'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
