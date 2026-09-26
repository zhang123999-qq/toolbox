import type { ToolMeta } from '@toolbox/catalog'

/**
 * grid-generator —— 全局编号 #234
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 可视化生成 Grid CSS
 */
export const meta: ToolMeta = {
  id: 'grid-generator',
  slug: 'grid-generator',
  title: 'Grid 生成',
  description: '可视化配置 CSS Grid 布局，一键生成 grid-template 等 CSS',
  titleEn: 'Grid Generator',
  descriptionEn: 'Visually configure a CSS grid layout and generate the CSS',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'grid', 'layout', 'generator'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['columns', 'rows', 'gap', 'justifyItems', 'alignItems'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
