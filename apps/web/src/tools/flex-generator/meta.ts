import type { ToolMeta } from '@toolbox/catalog'

/**
 * flex-generator —— 全局编号 #233
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 可视化生成 Flex CSS
 */
export const meta: ToolMeta = {
  id: 'flex-generator',
  slug: 'flex-generator',
  title: 'Flex 生成',
  description: '可视化配置 Flex 布局，一键生成对应 CSS',
  titleEn: 'Flex Generator',
  descriptionEn: 'Visually configure a flexbox layout and generate the CSS',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'flex', 'layout', 'generator'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'justify', 'align', 'wrap', 'gap'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
