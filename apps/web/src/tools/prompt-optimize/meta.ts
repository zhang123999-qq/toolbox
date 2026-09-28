import type { ToolMeta } from '@toolbox/catalog'

/**
 * prompt-optimize —— 全局编号 #592
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：C（BYOK 调用 OpenAI-compatible 接口）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'prompt-optimize',
  slug: 'prompt-optimize',
  title: '提示词优化',
  description: '填入自己的 API Key，把粗糙提示词改写为结构化高质量提示词，展示优化前后对比',
  titleEn: 'Prompt Optimizer',
  descriptionEn:
    'Rewrite a rough prompt into a structured high-quality prompt with your own API key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'prompt', 'byok', 'openai'],

  priority: 'P0',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['baseURL', 'model', 'apiKey'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
