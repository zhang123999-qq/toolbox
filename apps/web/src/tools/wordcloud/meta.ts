import type { ToolMeta } from '@toolbox/catalog'

/**
 * wordcloud —— 全局编号 #675
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 中英文词频统计 + canvas 手写词云（阿基米德螺旋布局，不引入 echarts-wordcloud），支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'wordcloud',
  slug: 'wordcloud',
  title: '词云',
  description: '统计文本词频，用 Canvas 绘制词云（螺旋布局），支持 PNG 导出',
  titleEn: 'Word Cloud',
  descriptionEn: 'Count word frequency and draw a word cloud on canvas, with PNG export',

  category: 'random',
  group: 'design',
  tags: ['wordcloud', 'canvas', 'visualization', 'text', 'freq'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['image'],
  options: ['topN', 'width', 'height', 'minSize', 'maxSize'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
