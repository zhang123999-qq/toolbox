import type { ToolMeta } from '@toolbox/catalog'

/**
 * ast-viewer —— 全局编号 #276
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'ast-viewer',
  slug: 'ast-viewer',
  title: 'AST 查看',
  description: '把 JS 代码解析成缩进的结构化 AST 树（自研轻量解析器）',
  titleEn: 'AST Viewer',
  descriptionEn:
    'Parse JavaScript code into an indented AST tree with a built-in lightweight parser',

  category: 'devops',
  group: 'dev',
  tags: ['ast', 'javascript', 'parser', 'tokenizer', 'tree'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
