import type { ToolMeta } from '@toolbox/catalog'

/**
 * template —— 全局编号 #25
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'template',
  slug: 'template',
  title: '模板变量替换',
  description: '用变量替换模板占位符',
  titleEn: 'Template Variables',
  descriptionEn: 'Replace template placeholders with variables',

  category: 'text',
  group: 'dev',
  tags: ['text', 'template', 'variable'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['syntax', 'keepMissing'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
