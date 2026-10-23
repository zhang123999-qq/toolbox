import type { ToolMeta } from '@toolbox/catalog'

/**
 * bar-chart —— 全局编号 #666
 * 域：visualization（数据可视化）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 将逗号/制表符分隔的数据转换为 SVG 条形图
 */
export const meta: ToolMeta = {
  id: 'bar-chart',
  slug: 'bar-chart',
  title: '条形图生成',
  description: '将简单数据行（标签 + 数值）转换为纯 SVG 条形图',
  titleEn: 'Bar Chart Generator',
  descriptionEn: 'Convert simple label-value rows into a pure SVG bar chart',

  category: 'visualization',
  group: 'design',
  tags: ['visualization', 'chart', 'svg', 'data'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['barColor'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
