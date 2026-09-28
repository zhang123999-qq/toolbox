import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-flip —— 全局编号 #424
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片翻转：本地 Canvas 镜像（水平 / 垂直，可叠加为旋转 180°），输出格式与质量可选。
 * 与 image-compress（#421）同属图片域 T2 模板：同样的投放区 / 选项 / 结果三段式 UI，
 * 区别在于本工具只做几何翻转，不改变分辨率与压缩策略。
 */
export const meta: ToolMeta = {
  id: 'image-flip',
  slug: 'image-flip',
  title: '图片翻转',
  description: '本地翻转图片：水平 / 垂直镜像，可叠加为旋转 180°，全程不上传',
  titleEn: 'Image Flip',
  descriptionEn:
    'Flip images locally: horizontal / vertical mirror, combinable into 180° rotation, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'flip', 'mirror', 'rotate'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['flipH', 'flipV', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
