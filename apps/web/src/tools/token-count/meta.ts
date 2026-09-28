import type { ToolMeta } from '@toolbox/catalog'

/**
 * token-count —— 全局编号 #593
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：C（gpt-tokenizer 动态导入）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'token-count',
  slug: 'token-count',
  title: 'Token计数',
  description: '按模型分词器统计文本的 Token 数量，估算调用成本前的用量',
  titleEn: 'Token Counter',
  descriptionEn: 'Count tokens of a text with the selected model tokenizer',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'token', 'tokenizer', 'gpt'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['tokenizer'],

  deps: ['gpt-tokenizer'],
  worker: false,
  wasm: false,
  api: false,
}
