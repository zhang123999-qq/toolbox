import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-slider —— 全局编号 #479
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片对比滑块：上传同一场景的前/后两张图，拖拽分隔线做视觉对比（左右/上下两种方向）。
 * 实现为纯 CSS + DOM：两张图绝对定位叠放，上层图用 clip-path 按滑块百分比裁剪，不引入新依赖、不使用 canvas。
 * 与「图片对比」（image-compare，#449）的区别：#449 做像素级差异计算，提供并排/差异热力图等分析视图；
 * #479 只做拖拽滑块的直观视觉对比，不做任何像素计算。
 */
export const meta: ToolMeta = {
  id: 'image-slider',
  slug: 'image-slider',
  title: '图片对比滑块',
  description: '上传前后两张图，拖拽分隔线直观对比差异，支持左右/上下两种方向，全程不上传',
  titleEn: 'Image Comparison Slider',
  descriptionEn:
    'Upload before/after images and compare them with a draggable slider, horizontal or vertical, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'compare', 'slider', 'before-after'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['image'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
