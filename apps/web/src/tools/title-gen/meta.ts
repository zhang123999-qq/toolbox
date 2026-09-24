import type { ToolMeta } from '@toolbox/catalog'

/**
 * title-gen —— 全局编号 #49
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'title-gen',
  slug: 'title-gen',
  title: '标题生成',
  description: '根据内容生成标题',
  titleEn: 'Title Generator',
  descriptionEn: 'Generate titles from content',

  category: 'text',
  group: 'dev',
  tags: ['text', 'title', 'ai'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text', 'apiBase', 'apiKey', 'model'],
  outputs: ['text'],
  options: ['style', 'count'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
