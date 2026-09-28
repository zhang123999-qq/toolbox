import type { ToolMeta } from '@toolbox/catalog'

/**
 * embedding-vis —— 全局编号 #597
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：C（PCA + echarts 散点）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'embedding-vis',
  slug: 'embedding-vis',
  title: '嵌入可视化',
  description: '把文本向量 PCA 降到 2D 散点展示，悬停查看文本标签',
  titleEn: 'Embedding Visualization',
  descriptionEn: 'Project text vectors to 2D with PCA and explore them in a scatter plot',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'embedding', 'pca', 'visualization', 'echarts'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['dim'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
