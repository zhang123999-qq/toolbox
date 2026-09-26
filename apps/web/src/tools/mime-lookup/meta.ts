import type { ToolMeta } from '@toolbox/catalog'

/**
 * mime-lookup —— 全局编号 #181
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'mime-lookup',
  slug: 'mime-lookup',
  title: 'MIME 查询',
  description: '按扩展名查 MIME 类型，或按 MIME 类型反查扩展名，支持关键词模糊搜索',
  titleEn: 'MIME Lookup',
  descriptionEn: 'Look up MIME types by extension, extensions by MIME type, or fuzzy-search both',

  category: 'data-format',
  group: 'dev',
  tags: ['mime', 'content-type', 'lookup'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'strict'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
