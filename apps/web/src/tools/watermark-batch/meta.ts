import type { ToolMeta } from '@toolbox/catalog'

/**
 * watermark-batch —— 全局编号 #469
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 多张图片批量加文字水印：统一设置一次应用到全部图片（文本、九宫格位置、
 * 字号按短边百分比、颜色、不透明度、旋转角度、平铺），并发 3、逐项进度 /
 * 状态（等待/处理中/成功/失败）、结果缩略图与逐项下载，全程本地 Canvas 处理。
 * 与相近工具的边界：
 *  - vs #430 watermark（单张图片水印）：#430 是单张精细调节（绝对像素字号、
 *    边距、-180–180° 旋转）；本工具是批量版，一次统一设置应用到多张图片，
 *    字号按图片短边百分比自适应，不提供单张级边距微调。
 *  - vs #57 text-watermark（文本水印）：#57 是往文本里嵌入零宽字符的隐藏水印，
 *    操作对象是文本而非图片；本工具是图片 Canvas 可见水印，两者不相关。
 */
export const meta: ToolMeta = {
  id: 'watermark-batch',
  slug: 'watermark-batch',
  title: '图片水印批量',
  description: '批量给多张图片加文字水印：统一设置一次应用，逐项进度与单独下载，全程本地处理',
  titleEn: 'Batch Image Watermark',
  descriptionEn:
    'Add text watermarks to multiple images at once: one setting for all, per-item progress and download, fully local',

  category: 'image',
  group: 'design',
  tags: ['image', 'watermark', 'batch', 'text', 'canvas'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: [
    'text',
    'position',
    'fontSize',
    'color',
    'opacity',
    'angle',
    'tile',
    'format',
    'quality',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
