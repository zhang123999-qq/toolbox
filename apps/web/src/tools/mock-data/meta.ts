import type { ToolMeta } from '@toolbox/catalog'

/**
 * mock-data —— 全局编号 #187
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md（依赖：faker → 改为纯 TS 自实现）
 */
export const meta: ToolMeta = {
  id: 'mock-data',
  slug: 'mock-data',
  title: 'Mock 数据',
  description: '按给定 JSON 模板批量生成 Mock 数据：姓名、邮箱、电话、地址、日期、UUID 等',
  titleEn: 'Mock Data',
  descriptionEn:
    'Generate bulk mock data from a JSON template: names, emails, phones, dates, UUIDs',

  category: 'data-format',
  group: 'dev',
  tags: ['mock', 'faker', 'json'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'stable'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
