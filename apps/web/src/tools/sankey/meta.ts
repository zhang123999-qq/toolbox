import type { ToolMeta } from '@toolbox/catalog'

/**
 * sankey —— 全局编号 #672
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 桑基图：行文本输入 源,目标,数值，ECharts 渲染流量流向图，支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'sankey',
  slug: 'sankey',
  title: '桑基图',
  description: '输入源-目标-数值数据，用 ECharts 渲染桑基图，支持标题与 PNG 导出',
  titleEn: 'Sankey Diagram',
  descriptionEn: 'Render ECharts sankey diagrams from source-target-value data, with PNG export',
  category: 'random',
  group: 'design',
  tags: ['sankey', 'echarts', 'chart', 'flow'],
  priority: 'P2',
  feasibility: 'A',
  template: 'T3',
  inputs: ['text'],
  outputs: ['text'],
  options: ['title', 'width', 'height'],
  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
