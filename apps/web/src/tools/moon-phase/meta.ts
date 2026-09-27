import type { ToolMeta } from '@toolbox/catalog'

/**
 * moon-phase —— 全局编号 #300
 * 域：datetime（日期 / 时间）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 基于朔望月的自研月相算法
 */
export const meta: ToolMeta = {
  id: 'moon-phase',
  slug: 'moon-phase',
  title: '月相查询',
  description: '按日期计算月龄、照明比例、月相及下一次满月/新月',
  titleEn: 'Moon Phase',
  descriptionEn:
    'Compute moon age, illumination, phase name and the next full/new moon for a given date',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'moon', 'moon-phase', 'lunar', 'astronomy'],

  priority: 'P2',
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
