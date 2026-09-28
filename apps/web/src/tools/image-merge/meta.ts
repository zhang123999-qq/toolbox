import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-merge —— 全局编号 #439
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 通用多图拼接：横向（左右拼）/ 纵向（上下拼）/ 网格（按列数换行），纯 Canvas 本地合成。
 * 与 #440（image-long-stitch 长图拼接）的区别：
 *   #439 是通用拼接工具，支持横向、纵向、网格三种方向，可调间距/背景色/对齐/列数；
 *   #440 是专用纵向长图工具（截图拼长图场景，纵向连续拼接为主）。
 */
export const meta: ToolMeta = {
  id: 'image-merge',
  slug: 'image-merge',
  title: '图片拼接',
  description: '本地拼接多张图片：横向 / 纵向 / 网格三种方向，可调间距、背景色与对齐，全程不上传',
  titleEn: 'Image Merge',
  descriptionEn:
    'Merge multiple images locally: horizontal / vertical / grid layouts with adjustable gap, background and alignment, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'merge', 'collage', 'stitch'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['direction', 'columns', 'gap', 'bgColor', 'align', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
