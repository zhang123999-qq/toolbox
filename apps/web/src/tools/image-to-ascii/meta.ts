import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-to-ascii —— 全局编号 #451
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 图片转 ASCII 字符画：按目标字符宽度下采样（字符高宽比约 2:1 做行高补偿），
 * 亮度映射字符集，可选反色；纯文本模式下载 .txt，彩色模式下载 .html。
 */
export const meta: ToolMeta = {
  id: 'image-to-ascii',
  slug: 'image-to-ascii',
  title: '图片转 ASCII',
  description: '图片转 ASCII 字符画：可选字符集与字符宽度，支持反色与彩色 HTML 输出，全程不上传',
  titleEn: 'Image to ASCII',
  descriptionEn:
    'Convert images to ASCII art: charset and character-width options, invert and colored HTML output, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'ascii', 'text', 'art'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['charWidth', 'charset', 'invert', 'color'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
