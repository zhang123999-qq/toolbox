import type { ToolMeta } from '@toolbox/catalog'

/**
 * ai-rewrite —— 全局编号 #587
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS + BYOK 调用 LLM）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ai-rewrite',
  slug: 'ai-rewrite',
  title: '文本改写',
  description: 'BYOK 模式调用大语言模型，按正式 / 简洁 / 生动 / 扩写四种风格改写文本',
  titleEn: 'AI Rewriter',
  descriptionEn: 'Rewrite text with your own LLM API key: formal, concise, vivid or expanded',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'rewrite', 'byok'],

  priority: 'P0',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['style', 'apiKey', 'baseUrl', 'model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
