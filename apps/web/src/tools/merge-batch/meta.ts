import type { ToolMeta } from '@toolbox/catalog'

/**
 * merge-batch —— 全局编号 #474
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 图片拼接批量：多张图片按「每组 N 张」自动分组，每组按统一设置（方向/间距/
 * 背景色/对齐）拼成一张图，逐项缩略图 + 逐项下载，全程本地 Canvas 处理。
 * 最后一组若只有 1 张，则该组不拼接、直接输出原图。
 * 与相近工具的边界：
 *  - vs #439 image-merge（单次任务：多张图→一张图，支持横向/纵向/网格）：
 *    本工具是批量版——多组→多张，按每组 N 张自动分组，逐项输出下载。
 *  - vs #440 long-image（多图纵向长图，单任务）：本工具是多组批量，
 *    每组独立输出一张拼图。
 */
export const meta: ToolMeta = {
  id: 'merge-batch',
  slug: 'merge-batch',
  title: '图片拼接批量',
  description: '按每组 N 张自动分组批量拼接图片，多组多张输出，本地 Canvas 处理不上传',
  titleEn: 'Batch Image Merger',
  descriptionEn:
    'Batch-merge images by auto-grouping every N images: multiple groups in, multiple collages out, local Canvas processing, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'merge', 'batch', 'collage', 'canvas'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['groupSize', 'direction', 'gap', 'bgColor', 'align', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
