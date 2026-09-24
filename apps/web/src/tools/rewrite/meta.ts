import type { ToolMeta } from '@toolbox/catalog'

/**
 * rewrite —— 全局编号 #47
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'rewrite',
  slug: 'rewrite',
  title: '文本改写',
  description: '同义改写、润色',
  titleEn: 'Text Rewriter',
  descriptionEn: 'Paraphrase and polish text',

  category: 'text',
  group: 'dev',
  tags: ['text', 'rewrite', 'ai'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text', 'apiBase', 'apiKey', 'model'],
  outputs: ['text'],
  options: ['style'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
