import type { ToolMeta } from '@toolbox/catalog'

/**
 * mime-encode —— 全局编号 #88
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'mime-encode',
  slug: 'mime-encode',
  title: 'MIME 编码',
  description: 'RFC 2047 邮件头编码（Encoded-Word），支持 B / Q 两种模式',
  titleEn: 'MIME Encoded-Word',
  descriptionEn: 'Encode and decode RFC 2047 mail header words in B or Q mode',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'mime', 'email'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'charset', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
