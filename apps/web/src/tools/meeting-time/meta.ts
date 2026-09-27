import type { ToolMeta } from '@toolbox/catalog'

/**
 * meeting-time —— 全局编号 #298
 * 域：datetime（日期与时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 输入一个时间 + 源时区 + 多个参与方时区，换算各参与方当地时间并标注工作时间 / 深夜。
 */
export const meta: ToolMeta = {
  id: 'meeting-time',
  slug: 'meeting-time',
  title: '多时区会议时间',
  description: '把一个会议时间换算到各参与方时区，标注是否在工作时间或深夜',
  titleEn: 'Meeting Time Across Time Zones',
  descriptionEn:
    'Convert a meeting time to each participant time zone, flag work hours vs late night',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timezone', 'meeting', 'utc', 'offset'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'sourceZone', 'zones'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
