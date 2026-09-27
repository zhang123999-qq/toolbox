import type { ToolMeta } from '@toolbox/catalog'

/**
 * date-calc —— 全局编号 #284
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 日期加减：基准日期 + 操作（加/减）+ 数量 + 单位，输出结果日期
 */
export const meta: ToolMeta = {
  id: 'date-calc',
  slug: 'date-calc',
  title: '日期加减',
  description: '在基准日期上加减年/月/周/日/时/分/秒，正确处理闰年与月末溢出',
  titleEn: 'Date Calculator',
  descriptionEn:
    'Add or subtract years/months/weeks/days/hours/minutes/seconds from a base date, with leap-year and month-end overflow handling',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'date', 'calendar', 'leap-year'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['op', 'amount', 'unit'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
