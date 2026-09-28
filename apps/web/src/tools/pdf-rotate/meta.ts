import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-rotate —— 全局编号 #484
 * 域：pdf（PDF 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * PDF 页面旋转：选择顺时针旋转角度（90/180/270），可作用于整文档或指定页面
 * （页范围如 "1-3,5"）。用 pdf-lib 的 page.setRotation(degrees(...)) 实现，
 * 新角度 = (原角度 + 增量) % 360，累加取模，全程本地不上传。
 */
export const meta: ToolMeta = {
  id: 'pdf-rotate',
  slug: 'pdf-rotate',
  title: 'PDF 旋转',
  description: '本地旋转 PDF 页面：可选 90/180/270 度，整文档或指定页面，角度累加取模，全程不上传',
  titleEn: 'PDF Rotate',
  descriptionEn:
    'Rotate PDF pages locally: 90/180/270 degrees, whole document or specific pages, cumulative modulo 360, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'rotate', 'pages'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['angle', 'scope', 'pages'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
