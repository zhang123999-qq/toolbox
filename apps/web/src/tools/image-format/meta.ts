import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-format —— 全局编号 #471
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 批量图片格式检测：只读每张图片前 12 字节文件头魔数识别真实格式，
 * 逐项判定「扩展名声明类型 vs 真实格式」的一致性，支持一键复制/下载检测报告；
 * 全程本地处理，只读文件头、不解码图片、不上传。
 * 与「图片信息」（image-info，#467）的边界：image-info 是单张图片元信息查看
 * （尺寸、宽高比、百万像素、魔数等）；本工具是批量筛查，聚焦扩展名与真实格式的
 * 一致性判定 + 可导出报告，不做尺寸等元信息展示。
 */
export const meta: ToolMeta = {
  id: 'image-format',
  slug: 'image-format',
  title: '图片格式检测',
  description: '批量检测图片真实格式：读文件头魔数，判定扩展名与内容一致性，可导出报告',
  titleEn: 'Image Format Detector',
  descriptionEn:
    'Batch-detect real image formats from file-header magic numbers, check extension vs content consistency, exportable report',

  category: 'image',
  group: 'design',
  tags: ['image', 'format', 'detect', 'magic', 'batch'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
