import type { ToolMeta } from '@toolbox/catalog'

/**
 * http-header-parser —— 全局编号 #180
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'http-header-parser',
  slug: 'http-header-parser',
  title: 'HTTP Header',
  description: '解析 HTTP 请求 / 响应头为结构化数据，或由键值对生成头文本',
  titleEn: 'HTTP Header',
  descriptionEn: 'Parse HTTP request/response headers into structured data, or build them back',

  category: 'data-format',
  group: 'dev',
  tags: ['http', 'header', 'parse'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
