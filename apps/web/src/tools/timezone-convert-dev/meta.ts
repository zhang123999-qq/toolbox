import type { ToolMeta } from '@toolbox/catalog'

/**
 * timezone-convert-dev —— 全局编号 #199
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 跨时区时间转换（Intl.DateTimeFormat，纯 JS）
 */
export const meta: ToolMeta = {
  id: 'timezone-convert-dev',
  slug: 'timezone-convert-dev',
  title: '时区转换',
  description: '把某个时区的日期时间换算到另一个时区（Intl）',
  titleEn: 'Timezone Converter',
  descriptionEn: 'Convert a wall-clock time between timezones using Intl.DateTimeFormat',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'timezone', 'datetime', 'intl'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['fromTz', 'toTz'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
