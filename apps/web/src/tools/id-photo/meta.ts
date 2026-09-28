import type { ToolMeta } from '@toolbox/catalog'

/**
 * id-photo —— 全局编号 #459
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 证件照制作：按证件照规格（mm）裁剪人像、更换底色、输出 JPG；可选拼版打印
 * （5寸相纸 / A4）。纯 Canvas 本地处理，不上传。
 */
export const meta: ToolMeta = {
  id: 'id-photo',
  slug: 'id-photo',
  title: '证件照制作',
  description: '按一寸/二寸等规格裁剪人像、更换红蓝白底色、输出 JPG，可选 5寸/A4 拼版打印',
  titleEn: 'ID Photo Maker',
  descriptionEn:
    'Crop portraits to ID photo specs, change red/blue/white background, export JPG, optional 5-inch/A4 print layout',

  category: 'image',
  group: 'design',
  tags: ['id-photo', 'print', 'photo'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['spec', 'dpi', 'bgColor', 'scale', 'layout'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
