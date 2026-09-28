import type { ToolMeta } from '@toolbox/catalog'

/**
 * long-image —— 全局编号 #440
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 多图纵向拼接成一张长图（适合聊天记录、网页截图拼接），带统一宽度与排序功能。
 * 与 #439 的区别：#439 是通用拼接（横向 / 纵向 / 网格自由排布）；
 * 本工具 #440 专做纵向长图，核心能力是「统一宽度」（以最宽图为准等比缩放）
 * 与「上移/下移排序」，为长截图/聊天记录场景定制。
 */
export const meta: ToolMeta = {
  id: 'long-image',
  slug: 'long-image',
  title: '长图拼接',
  description: '多图纵向拼成长图：统一宽度、图片排序、间距与背景色可调，全程不上传',
  titleEn: 'Long Image Stitcher',
  descriptionEn:
    'Stitch multiple images vertically into one long image: unified width, reordering, gap and background, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'stitch', 'long-image', 'screenshot'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['widthMode', 'align', 'gap', 'bgColor', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
