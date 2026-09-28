import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-rotate —— 全局编号 #423
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片旋转：本地 Canvas 旋转任意角度。快捷按钮（顺时针 90°/180°/270°）可连续点击
 * 累加；也支持 -360~360 的任意角度输入。非直角旋转时画布自动扩大并以背景色
 * 填充（PNG 可选透明背景），输出格式 jpeg/png/webp 可选、质量可调，全程不上传。
 */
export const meta: ToolMeta = {
  id: 'image-rotate',
  slug: 'image-rotate',
  title: '图片旋转',
  description:
    '本地旋转图片任意角度：快捷 90°/180°/270° 可连续累加，支持 -360~360° 任意角度，输出可选格式与质量',
  titleEn: 'Image Rotate',
  descriptionEn:
    'Rotate images locally by any angle: stackable 90°/180°/270° presets, arbitrary -360°–360° input, format & quality options',

  category: 'image',
  group: 'design',
  tags: ['image', 'rotate', 'jpeg', 'webp', 'png'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['angle', 'format', 'quality', 'backgroundColor', 'transparent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
