import type { ToolMeta } from '@toolbox/catalog'

/**
 * punycode —— 全局编号 #86
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'punycode',
  slug: 'punycode',
  title: 'Punycode',
  description: '国际化域名（IDN）编码解码，按 RFC 3492 逐标签处理',
  titleEn: 'Punycode',
  descriptionEn: 'Encode and decode internationalized domain names per RFC 3492',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'punycode', 'idn'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
