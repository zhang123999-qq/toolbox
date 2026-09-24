import type { ToolMeta } from '@toolbox/catalog'

/**
 * sentiment —— 全局编号 #8
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：B｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'sentiment',
  slug: 'sentiment',
  title: '情感分析',
  description: '本地轻量情感倾向分析',
  titleEn: 'Sentiment',
  descriptionEn: 'Lightweight local sentiment analysis',

  category: 'text',
  group: 'dev',
  tags: ['text', 'sentiment', 'nlp'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language'],

  deps: ['compromise'],
  worker: false,
  wasm: true,
  api: false,
}
