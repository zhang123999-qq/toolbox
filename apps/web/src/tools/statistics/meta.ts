import type { ToolMeta } from '@toolbox/catalog'

/**
 * statistics —— 全局编号 #367
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 统计图表：粘贴数字/CSV 数据 → 柱状图 / 折线图 / 饼图切换（echarts），附汇总统计
 *
 * 与 text-stats（#52 文本统计图）的区别：text-stats 统计的是文本词频/长度分布，
 * 本工具处理的是数值型数据（CSV/数字列表），图表类型可在柱/线/饼之间切换。
 */
export const meta: ToolMeta = {
  id: 'statistics',
  slug: 'statistics',
  title: '统计图表',
  description: '粘贴数字或 CSV 数据，生成柱状图 / 折线图 / 饼图，附汇总统计',
  titleEn: 'Statistics Chart',
  descriptionEn:
    'Paste numbers or CSV data to render bar / line / pie charts with summary statistics',

  category: 'math',
  group: 'life',
  tags: ['statistics', 'chart', 'data', 'math'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['chart', 'decimals'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
