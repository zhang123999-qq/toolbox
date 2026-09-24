import type { ToolMeta } from '@toolbox/catalog'

/**
 * translate —— 全局编号 #48
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'translate',
  slug: 'translate',
  title: '翻译',
  description: '多语言翻译',
  titleEn: 'Translator',
  descriptionEn: 'Translate text between languages',

  category: 'text',
  group: 'dev',
  tags: ['text', 'translate', 'ai'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text', 'apiBase', 'apiKey', 'model'],
  outputs: ['text'],
  options: ['source', 'target'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
