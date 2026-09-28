import type { ToolMeta } from '@toolbox/catalog'

/**
 * local-qa —— 全局编号 #598
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS TF-IDF 抽取式问答）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'local-qa',
  slug: 'local-qa',
  title: '本地问答',
  description: '基于粘贴文档的抽取式问答：TF-IDF 检索相关句并组合回答，不联网',
  titleEn: 'Local QA',
  descriptionEn:
    'Extractive question answering over your pasted documents with TF-IDF, fully offline',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'qa', 'tf-idf', 'local', 'nlp'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['topK'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
