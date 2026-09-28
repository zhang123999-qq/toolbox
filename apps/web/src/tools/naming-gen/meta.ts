import type { ToolMeta } from '@toolbox/catalog'

/**
 * naming-gen —— 全局编号 #609
 * 域：ai（AI / LLM）｜大组：life｜优先级：P2｜可行性：D（BYOK 请 LLM 生成命名）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'naming-gen',
  slug: 'naming-gen',
  title: '命名生成',
  description: '用中文描述变量或函数的含义，填自己的 Key 请大模型按指定风格生成候选命名',
  titleEn: 'Naming Generator',
  descriptionEn: 'Generate variable/function names in a chosen style with your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'naming', 'byok'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model', 'style'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
