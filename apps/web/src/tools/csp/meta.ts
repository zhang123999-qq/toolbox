import type { ToolMeta } from '@toolbox/catalog'

/**
 * csp —— 全局编号 #127
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'csp',
  slug: 'csp',
  title: 'CSP 生成',
  description: '生成 Content-Security-Policy 响应头（含 Report-Only）',
  titleEn: 'CSP Generator',
  descriptionEn: 'Generate a Content-Security-Policy header, including Report-Only',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'csp', 'security'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'target', 'strict', 'includeLower', 'includeUpper', 'includeNumbers'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
