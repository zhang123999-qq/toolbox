import type { ToolMeta } from '@toolbox/catalog'

/**
 * ai-summarize —— 全局编号 #586
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS + BYOK 调用 LLM）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ai-summarize',
  slug: 'ai-summarize',
  title: '文本摘要',
  description: 'BYOK 模式调用大语言模型，把长文本压缩成一句话 / 标准 / 详细摘要',
  titleEn: 'AI Summarizer',
  descriptionEn: 'Summarize long text with your own LLM API key: one-liner, standard or detailed',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'summarize', 'byok'],

  priority: 'P0',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'apiKey', 'baseUrl', 'model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
