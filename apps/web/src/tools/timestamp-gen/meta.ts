import type { ToolMeta } from '@toolbox/catalog'

/**
 * timestamp-gen —— 全局编号 #308
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 */
export const meta: ToolMeta = {
  id: 'timestamp-gen',
  slug: 'timestamp-gen',
  title: '时间戳生成',
  description: '把日期时间（可选时区）换算成 Unix 秒 / 毫秒时间戳',
  titleEn: 'Timestamp Generator',
  descriptionEn:
    'Convert a date-time (with optional IANA timezone) to Unix seconds and milliseconds',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timestamp', 'unix', 'epoch'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['zone'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
