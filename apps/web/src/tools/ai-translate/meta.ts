import type { ToolMeta } from '@toolbox/catalog'

/**
 * ai-translate —— 全局编号 #588
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS + BYOK 调用 LLM）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ai-translate',
  slug: 'ai-translate',
  title: '翻译',
  description: 'BYOK 模式调用大语言模型翻译文本，支持多语言对（中文友好语言名）',
  titleEn: 'AI Translator',
  descriptionEn: 'Translate text with your own LLM API key across multiple language pairs',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'translate', 'byok'],

  priority: 'P0',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['sourceLang', 'targetLang', 'apiKey', 'baseUrl', 'model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
