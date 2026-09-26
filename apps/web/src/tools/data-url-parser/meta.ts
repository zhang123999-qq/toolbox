import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-url-parser —— 全局编号 #183
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'data-url-parser',
  slug: 'data-url-parser',
  title: 'Data URL 解析',
  description: '解析 Data URL 的媒体类型、Base64 标志与解码内容，并统计字节数',
  titleEn: 'Data URL Parser',
  descriptionEn: 'Parse a data URL into media type, base64 flag, decoded content and byte size',

  category: 'data-format',
  group: 'dev',
  tags: ['data-url', 'rfc2397', 'parse'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
