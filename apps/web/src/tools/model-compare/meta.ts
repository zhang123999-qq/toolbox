import type { ToolMeta } from '@toolbox/catalog'

/**
 * model-compare —— 全局编号 #594
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：C（BYOK 并排调用两个模型）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'model-compare',
  slug: 'model-compare',
  title: '模型对比',
  description: '同一提示词并排调用两个模型，对比输出内容与耗时，填自己的 Key',
  titleEn: 'Model Comparison',
  descriptionEn: 'Run the same prompt on two models side by side with your own API key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'compare', 'byok', 'openai'],

  priority: 'P0',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['modelA', 'modelB'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
