import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-gen —— 全局编号 #607
 * 域：ai（AI / LLM）｜大组：life｜优先级：P2｜可行性：D（BYOK 请 LLM 生成 SQL）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sql-gen',
  slug: 'sql-gen',
  title: 'SQL 生成',
  description: '用自然语言描述需求，填自己的 Key 请大模型生成对应方言的 SQL 语句',
  titleEn: 'SQL Generator',
  descriptionEn: 'Generate SQL for a chosen dialect from natural language using your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'sql', 'byok'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model', 'dialect'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
