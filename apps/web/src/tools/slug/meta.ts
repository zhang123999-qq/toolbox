import type { ToolMeta } from '@toolbox/catalog'

/**
 * slug —— 全局编号 #24
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'slug',
  slug: 'slug',
  title: 'Slug 生成',
  description: '标题转 URL 友好 slug，支持中文拼音',
  titleEn: 'Slug Generator',
  descriptionEn: 'Turn a title into a URL-friendly slug, with Chinese pinyin support',

  category: 'text',
  group: 'dev',
  tags: ['text', 'slug', 'url'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['chinese', 'separator', 'lowercase'],

  deps: ['pinyin-pro'],
  worker: false,
  wasm: false,
  api: false,
}
