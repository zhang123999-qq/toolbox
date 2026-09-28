import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-explain —— 全局编号 #606
 * 域：ai（AI / LLM）｜大组：life｜优先级：P2｜可行性：D（BYOK 请 LLM 解释代码）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'code-explain',
  slug: 'code-explain',
  title: '代码解释',
  description: '粘贴代码，填自己的 Key 请大模型解释功能、关键逻辑与注意事项，支持选语言',
  titleEn: 'Code Explanation',
  descriptionEn: 'Explain pasted code with an LLM using your own key, with language selection',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'code', 'explain', 'byok'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model', 'language'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
