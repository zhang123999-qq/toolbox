import type { ToolMeta } from '@toolbox/catalog'

/**
 * timezone-convert —— 全局编号 #282
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 * 说明：正式版，与 devops 域的 timezone-convert-dev 相互独立。
 */
export const meta: ToolMeta = {
  id: 'timezone-convert',
  slug: 'timezone-convert',
  title: '时区转换',
  description: '把某时区的墙上时间换算到另一个时区（DST 自动处理）',
  titleEn: 'Timezone Converter',
  descriptionEn:
    'Convert a wall-clock time from one IANA timezone to another, with DST handled by Intl',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timezone', 'convert', 'dst'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['fromZone', 'toZone'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
