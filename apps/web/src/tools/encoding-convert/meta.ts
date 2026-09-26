import type { ToolMeta } from '@toolbox/catalog'

/**
 * encoding-convert —— 全局编号 #189
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md（依赖：iconv-lite → 改为浏览器原生 TextDecoder / TextEncoder）
 */
export const meta: ToolMeta = {
  id: 'encoding-convert',
  slug: 'encoding-convert',
  title: '编码转换',
  description: '文本与字节之间按指定字符集互相转换（UTF-8 / GBK / Big5 / Shift_JIS 等）',
  titleEn: 'Encoding Convert',
  descriptionEn: 'Convert text and bytes across charsets (UTF-8 / GBK / Big5 / Shift_JIS…)',

  category: 'data-format',
  group: 'dev',
  tags: ['encoding', 'charset', 'gbk', 'iconv'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'encoding', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
