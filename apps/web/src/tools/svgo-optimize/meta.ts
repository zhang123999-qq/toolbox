import type { ToolMeta } from '@toolbox/catalog'

/**
 * svgo-optimize —— 全局编号 #240
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * SVG 压缩优化（自研，替代 svgo）
 */
export const meta: ToolMeta = {
  id: 'svgo-optimize',
  slug: 'svgo-optimize',
  title: 'SVG 优化',
  description: '压缩 SVG：去注释/多余空白、缩短数字精度、去默认属性，输出压缩率',
  titleEn: 'SVG Optimize',
  descriptionEn:
    'Optimize SVG by stripping comments, whitespace, shortening number precision, and reporting ratio',

  category: 'devops',
  group: 'dev',
  tags: ['svg', 'optimize', 'compress', 'vector'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
