import type { ToolMeta } from '@toolbox/catalog'

/**
 * sprite-gen —— 全局编号 #455
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 雪碧图生成：多张图片拼成一张雪碧图（横向 / 纵向 / 网格），纯 Canvas 本地拼合，
 * 输出拼合图文件 + 每张子图的坐标数据（JSON 与 CSS 两种文本），全程不上传。
 */
export const meta: ToolMeta = {
  id: 'sprite-gen',
  slug: 'sprite-gen',
  title: '雪碧图生成',
  description: '多张图片拼成一张雪碧图：横向/纵向/网格布局，附带坐标 JSON 与 CSS，全程不上传',
  titleEn: 'Sprite Generator',
  descriptionEn:
    'Combine images into one sprite sheet: horizontal/vertical/grid layouts, with coordinate JSON and CSS, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'sprite', 'css'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file', 'text'],
  options: ['direction', 'columns', 'gap', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
