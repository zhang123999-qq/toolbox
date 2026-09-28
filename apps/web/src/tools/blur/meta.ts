import type { ToolMeta } from '@toolbox/catalog'

/**
 * blur —— 全局编号 #432
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 高斯模糊：本地 Canvas ctx.filter 滤镜，模糊半径 0–50px 可调，输出 JPEG/PNG/WebP。
 * 与「马赛克 / 像素化」（pixelate）不同：本工具是高斯平滑模糊，pixelate 是色块化。
 */
export const meta: ToolMeta = {
  id: 'blur',
  slug: 'blur',
  title: '图片模糊',
  description: '高斯模糊图片：模糊半径 0–50px 可调，本地 Canvas 处理，全程不上传',
  titleEn: 'Image Blur',
  descriptionEn: 'Gaussian blur for images: adjustable radius 0–50px, local Canvas, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'blur', 'gaussian', 'filter', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['radius', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
