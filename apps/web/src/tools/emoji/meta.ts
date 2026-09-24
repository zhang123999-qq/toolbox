import type { ToolMeta } from '@toolbox/catalog'

/**
 * emoji —— 全局编号 #54
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'emoji',
  slug: 'emoji',
  title: 'Emoji 查询',
  description: '搜索、复制 Emoji',
  titleEn: 'Emoji Picker',
  descriptionEn: 'Search and copy emoji',

  category: 'text',
  group: 'dev',
  tags: ['text', 'emoji', 'picker'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['category'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
