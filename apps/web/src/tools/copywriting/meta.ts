import type { ToolMeta } from '@toolbox/catalog'

/**
 * copywriting —— 全局编号 #610
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：D（BYOK 请 LLM 生成文案）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'copywriting',
  slug: 'copywriting',
  title: '文案生成',
  description: '输入产品描述，填自己的 Key 请大模型按类型与语气生成多条营销文案候选',
  titleEn: 'Copywriting Generator',
  descriptionEn: 'Generate marketing copy candidates by type and tone with your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'copy', 'byok'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model', 'copyType', 'tone'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
