import type { ToolMeta } from '@toolbox/catalog'

/**
 * cookie-parse —— 全局编号 #179
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'cookie-parse',
  slug: 'cookie-parse',
  title: 'Cookie 解析',
  description: 'Cookie / Set-Cookie 串与对象互转，支持属性标志位',
  titleEn: 'Cookie Parser',
  descriptionEn: 'Convert Cookie and Set-Cookie strings to objects and back, with flag attributes',

  category: 'data-format',
  group: 'dev',
  tags: ['cookie', 'parse', 'header'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'sortKeys'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
