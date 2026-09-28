import type { ToolMeta } from '@toolbox/catalog'

/**
 * chart-export —— 全局编号 #686
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 粘贴 echarts option JSON，在浏览器本地预览渲染，按指定尺寸/背景导出 PNG / SVG
 */
export const meta: ToolMeta = {
  id: 'chart-export',
  slug: 'chart-export',
  title: '图表导出',
  description: '粘贴 ECharts option JSON，本地预览并按指定尺寸与背景导出 PNG / SVG',
  titleEn: 'Chart Export',
  descriptionEn: 'Preview ECharts option JSON locally and export PNG / SVG at custom size',

  category: 'random',
  group: 'design',
  tags: ['chart', 'echarts', 'export', 'png', 'svg'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['image'],
  options: ['width', 'height', 'bgColor', 'format'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
