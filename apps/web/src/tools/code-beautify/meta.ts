import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-beautify —— 全局编号 #230
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 自研轻量多语言代码格式化（替代 prettier）
 */
export const meta: ToolMeta = {
  id: 'code-beautify',
  slug: 'code-beautify',
  title: '代码美化',
  description: '多语言代码格式化（JS / CSS / HTML / JSON / SQL），自研轻量缩进排版',
  titleEn: 'Code Beautify',
  descriptionEn:
    'Format code for JS / CSS / HTML / JSON / SQL with a lightweight self-built formatter',

  category: 'devops',
  group: 'dev',
  tags: ['code', 'format', 'beautify', 'javascript', 'css'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
