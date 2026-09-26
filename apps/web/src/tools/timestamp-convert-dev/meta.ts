import type { ToolMeta } from '@toolbox/catalog'

/**
 * timestamp-convert-dev —— 全局编号 #198
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * Unix 时间戳与日期互转（原生 Date，不依赖 dayjs）
 */
export const meta: ToolMeta = {
  id: 'timestamp-convert-dev',
  slug: 'timestamp-convert-dev',
  title: '时间戳转换',
  description: 'Unix 时间戳与日期时间互相转换（秒/毫秒自动识别）',
  titleEn: 'Unix Timestamp Converter',
  descriptionEn: 'Convert between Unix timestamps and human-readable dates (native Date)',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'timestamp', 'date', 'unix-time'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['unit'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
