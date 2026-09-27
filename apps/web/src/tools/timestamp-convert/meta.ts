import type { ToolMeta } from '@toolbox/catalog'

/**
 * timestamp-convert —— 全局编号 #283
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 * 说明：正式版，与 devops 域的 timestamp-convert-dev 相互独立。
 */
export const meta: ToolMeta = {
  id: 'timestamp-convert',
  slug: 'timestamp-convert',
  title: '时间戳转换',
  description: 'Unix 时间戳与日期互转，秒/毫秒按 1e12 阈值自动识别，支持负数',
  titleEn: 'Timestamp Converter',
  descriptionEn:
    'Convert between Unix timestamps and dates, auto-detecting seconds vs milliseconds (1e12 threshold), including negative values',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timestamp', 'unix', 'epoch'],

  priority: 'P0',
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
