import type { ToolMeta } from '@toolbox/catalog'

/**
 * favicon —— 全局编号 #386
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T3
 * Favicon 生成：简化 SVG 图标（字母 / 渐变 / 几何），可导出 PNG
 */
export const meta: ToolMeta = {
  id: 'favicon',
  slug: 'favicon',
  title: 'Favicon 生成',
  description: '生成网站标签页图标 favicon：字母 / 渐变 / 几何三种样式，可导出 SVG 与 PNG',
  titleEn: 'Favicon Generator',
  descriptionEn:
    'Generate a favicon: letter / gradient / geometric styles, exportable as SVG and PNG',

  category: 'random',
  group: 'design',
  tags: ['favicon', 'svg', 'icon', 'png'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['size', 'style', 'bgColor', 'fgColor'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
