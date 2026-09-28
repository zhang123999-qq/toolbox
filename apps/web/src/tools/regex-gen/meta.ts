import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-gen —— 全局编号 #608
 * 域：ai（AI / LLM）｜大组：life｜优先级：P2｜可行性：D（BYOK 请 LLM 生成正则）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'regex-gen',
  slug: 'regex-gen',
  title: '正则生成',
  description: '用自然语言描述匹配规则，填自己的 Key 请大模型生成正则并逐段解释，可在线测试',
  titleEn: 'Regex Generator',
  descriptionEn: 'Generate a regex from natural language with your own key, with live testing',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'regex', 'byok'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
