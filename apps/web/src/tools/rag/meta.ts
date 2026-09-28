import type { ToolMeta } from '@toolbox/catalog'

/**
 * rag —— 全局编号 #590
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS 检索 + 抽取式作答）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'rag',
  slug: 'rag',
  title: 'RAG问答',
  description: '纯 JS 实现：TF-IDF 检索 top-k 片段，再抽取关键词句拼成答案（无 LLM 生成）',
  titleEn: 'RAG QA',
  descriptionEn: 'Pure-JS RAG: TF-IDF retrieval of top-k chunks plus extractive answering',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'rag', 'qa', 'tf-idf', 'nlp'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['k'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
