import type { ToolMeta } from '@toolbox/catalog'

/**
 * watermark —— 全局编号 #430
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 单张图片文字水印：本地 Canvas 绘制（九宫格定位、可旋转、整图平铺），可选输出格式与质量。
 * 与「文本水印」（text-watermark，#57）不同：本工具给图片加可见文字水印，
 * text-watermark 是把零宽字符隐藏水印藏进纯文本；批量加水印见后续 #469 watermark-batch。
 */
export const meta: ToolMeta = {
  id: 'watermark',
  slug: 'watermark',
  title: '图片水印',
  description: '本地给图片加文字水印：九宫格定位、旋转角度、整图平铺，全程不上传',
  titleEn: 'Image Watermark',
  descriptionEn:
    'Add text watermarks to images locally: 3x3 grid positioning, rotation, full-image tiling, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'watermark', 'text', 'jpeg', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: [
    'text',
    'fontSize',
    'color',
    'opacity',
    'position',
    'angle',
    'tile',
    'margin',
    'format',
    'quality',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
