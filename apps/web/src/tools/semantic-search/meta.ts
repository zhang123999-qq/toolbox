import type { ToolMeta } from '@toolbox/catalog'

/**
 * semantic-search —— 全局编号 #589
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS TF-IDF）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'semantic-search',
  slug: 'semantic-search',
  title: '语义搜索',
  description: '纯 JS 实现：TF-IDF + 余弦相似度，按相关度给文档库排序（词袋模型演示）',
  titleEn: 'Semantic Search',
  descriptionEn: 'Rank documents by TF-IDF cosine similarity in pure JS (bag-of-words demo)',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'search', 'tf-idf', 'nlp'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
