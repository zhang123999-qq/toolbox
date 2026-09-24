import type { ToolMeta } from '@toolbox/catalog'

/**
 * summarize —— 全局编号 #46
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'summarize',
  slug: 'summarize',
  title: '文本摘要',
  description: '提取式或生成式摘要',
  titleEn: 'Text Summarizer',
  descriptionEn: 'Extractive or abstractive summarization',

  category: 'text',
  group: 'dev',
  tags: ['text', 'summary', 'ai'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text', 'apiBase', 'apiKey', 'model'],
  outputs: ['text'],
  options: ['mode', 'length'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
