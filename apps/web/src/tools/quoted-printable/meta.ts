import type { ToolMeta } from '@toolbox/catalog'

/**
 * quoted-printable —— 全局编号 #87
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'quoted-printable',
  slug: 'quoted-printable',
  title: 'Quoted-Printable',
  description: 'RFC 2045 邮件正文编码，按行折行并转义不可打印字节',
  titleEn: 'Quoted-Printable',
  descriptionEn: 'RFC 2045 quoted-printable encode and decode with soft line breaks',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'quoted-printable', 'email'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'length'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
