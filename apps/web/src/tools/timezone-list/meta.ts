import type { ToolMeta } from '@toolbox/catalog'

/**
 * timezone-list —— 全局编号 #309
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 */
export const meta: ToolMeta = {
  id: 'timezone-list',
  slug: 'timezone-list',
  title: '时区列表',
  description: '列出全部 IANA 时区，按关键词过滤，显示当前偏移与时间',
  titleEn: 'Timezone List',
  descriptionEn:
    'List all IANA timezones with keyword filter, showing current UTC offset and wall-clock time',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timezone', 'list', 'iana'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
