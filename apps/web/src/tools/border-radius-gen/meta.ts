import type { ToolMeta } from '@toolbox/catalog'

/**
 * border-radius-gen —— 全局编号 #237
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * CSS 圆角生成
 */
export const meta: ToolMeta = {
  id: 'border-radius-gen',
  slug: 'border-radius-gen',
  title: '圆角生成',
  description: '分别配置四个角的圆角半径，输出 border-radius 简写与分别写法',
  titleEn: 'Border Radius Generator',
  descriptionEn:
    'Set radius for each corner and generate border-radius shorthand and per-corner CSS',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'border-radius', 'generator'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['tl', 'tr', 'br', 'bl'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
