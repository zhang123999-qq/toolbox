import type { ToolMeta } from '@toolbox/catalog'

/**
 * world-clock —— 全局编号 #281
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 */
export const meta: ToolMeta = {
  id: 'world-clock',
  slug: 'world-clock',
  title: '世界时钟',
  description: '并列展示多个 IANA 时区的当前时间与 UTC 偏移',
  titleEn: 'World Clock',
  descriptionEn:
    'Show the current wall-clock time and UTC offset for a list of IANA timezones side by side',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timezone', 'clock', 'world'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['hour12'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
