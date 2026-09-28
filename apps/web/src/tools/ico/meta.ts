import type { ToolMeta } from '@toolbox/catalog'

/**
 * ico —— 全局编号 #428
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * ICO 生成：把任意图片转换为真正的多尺寸 .ico 文件。纯手写 ICO 二进制格式
 * （ICONDIR + ICONDIRENTRY + PNG 内嵌），可选 16/24/32/48/64/128/256 七档尺寸，
 * 全程本地 Canvas 处理，不上传。
 * 与「Favicon 生成」（favicon，#386）的区别：favicon 是从零生成图标
 * （字母 / 渐变 / 几何三种样式，导出 SVG / PNG）；本工具是把任意图片
 * 转换为标准的 Windows 图标容器格式 .ico（多尺寸 PNG 内嵌）。
 */
export const meta: ToolMeta = {
  id: 'ico',
  slug: 'ico',
  title: 'ICO 生成',
  description: '把图片转换为真正的多尺寸 .ico 图标文件，全程本地处理不上传',
  titleEn: 'ICO Generator',
  descriptionEn:
    'Convert an image into a real multi-size .ico icon file, processed locally, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'ico', 'icon', 'favicon', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['sizes'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
