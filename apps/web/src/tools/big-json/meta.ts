import type { ToolMeta } from '@toolbox/catalog'

/**
 * big-json —— 全局编号 #151
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'big-json',
  slug: 'big-json',
  title: 'BigJSON 流式',
  description: '大 JSON 的单遍扫描：规模统计、键路径抽样、语法错误定位',
  titleEn: 'BigJSON Scanner',
  descriptionEn: 'Single-pass scan of big JSON: stats, key-path sampling and error location',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'bigdata', 'scan'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'topN'],

  // 规划表列的是 stream（Node 流式解析），浏览器里没有它；
  // 故降级为「自研单遍扫描」，只做统计 / 抽样 / 定位，不做全量物化
  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
