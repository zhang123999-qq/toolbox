import type { ToolMeta } from '@toolbox/catalog'

/**
 * chart-theme —— 全局编号 #687
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * ECharts 主题定制器：背景色 / 主色板 / 字体 / 标题字号 → 可注册的主题 JSON
 */
export const meta: ToolMeta = {
  id: 'chart-theme',
  slug: 'chart-theme',
  title: '图表主题',
  description: '定制 ECharts 主题：背景色、主色板、字体、标题字号，实时预览并导出主题 JSON',
  titleEn: 'Chart Theme',
  descriptionEn:
    'Customize an ECharts theme: background, palette, font and title size, with live preview and JSON export',

  category: 'random',
  group: 'design',
  tags: ['chart', 'echarts', 'theme', 'colors', 'design'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['background', 'palette', 'fontFamily', 'titleSize'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
