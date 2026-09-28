import type { ToolMeta } from '@toolbox/catalog'

/**
 * plagiarism —— 全局编号 #605
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：A（纯 JS：shingle n-gram + Jaccard 多文档相似度）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'plagiarism',
  slug: 'plagiarism',
  title: '抄袭检测',
  description: '多篇文档两两比对文本相似度，标出高度相似片段（只做文档间比对，不做全网查重）',
  titleEn: 'Plagiarism Check',
  descriptionEn: 'Pairwise text similarity across documents with highlighted similar passages',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'plagiarism', 'similarity', 'text', 'nlp'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['threshold'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
