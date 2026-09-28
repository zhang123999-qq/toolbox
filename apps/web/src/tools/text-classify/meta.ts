import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-classify —— 全局编号 #614
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：D（BYOK 请 LLM 做文本分类）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'text-classify',
  slug: 'text-classify',
  title: '文本分类',
  description: '给定候选类别，填自己的 Key 请大模型分类，返回类别与置信度',
  titleEn: 'Text Classification',
  descriptionEn: 'Classify text into your candidate categories with an LLM using your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'classify', 'byok', 'text'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['categories', 'model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
