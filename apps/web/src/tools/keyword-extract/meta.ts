import type { ToolMeta } from '@toolbox/catalog'

/**
 * keyword-extract —— 全局编号 #613
 * 域：ai（AI / LLM）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'keyword-extract',
  slug: 'keyword-extract',
  title: '关键词提取',
  description: '纯 JS 的 TF 关键词提取：分词、去停用词、按词频排序取 TopN',
  titleEn: 'Keyword Extraction',
  descriptionEn: 'TF-based keyword extraction in pure JS: tokenize, remove stopwords, rank by frequency',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'nlp', 'keyword', 'tfidf', 'text'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['topN'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
