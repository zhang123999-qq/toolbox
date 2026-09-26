import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-minify —— 全局编号 #231
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 自研 JS/CSS/HTML 压缩（替代 terser）
 */
export const meta: ToolMeta = {
  id: 'code-minify',
  slug: 'code-minify',
  title: '代码压缩',
  description: 'JS / CSS / HTML 压缩，去注释与多余空白，自研轻量实现',
  titleEn: 'Code Minify',
  descriptionEn: 'Minify JS / CSS / HTML by stripping comments and extra whitespace',

  category: 'devops',
  group: 'dev',
  tags: ['code', 'minify', 'compress', 'javascript', 'css'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
