import type { ToolMeta } from '@toolbox/catalog'

/**
 * date-format —— 全局编号 #306
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 */
export const meta: ToolMeta = {
  id: 'date-format',
  slug: 'date-format',
  title: '日期格式化',
  description: '按自定义格式串把日期时间格式化（自研 token，无 dayjs）',
  titleEn: 'Date Formatter',
  descriptionEn:
    'Format a date-time with a custom token pattern (YYYY/MM/DD/HH/mm/…), self-implemented without dayjs',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'format', 'date', 'pattern'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pattern'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
