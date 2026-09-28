import type { ToolMeta } from '@toolbox/catalog'

/**
 * rotate-batch —— 全局编号 #473
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 多张图片按统一角度批量旋转：90°/180°/270° 快捷预设 + -360~360 自定义角度，
 * 一次应用到全部图片；输出 JPEG/PNG/WebP（JPEG/WebP 可调质量）；逐项进度 /
 * 状态（等待/处理中/成功/失败）、并发 3、结果缩略图与逐项下载，全程本地 Canvas 处理。
 * 与相近工具的边界：
 *  - vs #423 image-rotate（单张图片旋转）：#423 是单张精细操作，快捷角度可
 *    在当前角度上连续累加、支持任意角度微调与背景色/透明选项；本工具是批量版，
 *    一个统一角度一次应用到多张图片，不提供逐张微调与累加。
 */
export const meta: ToolMeta = {
  id: 'rotate-batch',
  slug: 'rotate-batch',
  title: '图片旋转批量',
  description:
    '多张图片按统一角度批量旋转：90°/180°/270° 快捷预设与自定义角度，逐项进度与单独下载，全程本地处理',
  titleEn: 'Batch Image Rotate',
  descriptionEn:
    'Rotate multiple images by one unified angle: 90°/180°/270° presets and custom angle, per-item progress and download, fully local',

  category: 'image',
  group: 'design',
  tags: ['image', 'rotate', 'batch', 'canvas'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['angle', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
