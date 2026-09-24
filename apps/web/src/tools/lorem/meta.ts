import type { ToolMeta } from '@toolbox/catalog'

/**
 * lorem —— 全局编号 #26
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'lorem',
  slug: 'lorem',
  title: 'Lorem 生成',
  description: '生成乱数假文，支持中英文',
  titleEn: 'Lorem Ipsum Generator',
  descriptionEn: 'Generate placeholder text (lorem ipsum) in Chinese, English or Latin',

  category: 'text',
  group: 'dev',
  tags: ['text', 'lorem', 'generator'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language', 'unit', 'count'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
