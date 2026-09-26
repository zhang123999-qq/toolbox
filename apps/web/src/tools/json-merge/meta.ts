import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-merge —— 全局编号 #137
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-merge',
  slug: 'json-merge',
  title: 'JSON Merge',
  description: '合并两份 JSON，支持深层/浅层合并与冲突时的取舍策略',
  titleEn: 'JSON Merge',
  descriptionEn: 'Merge two JSON documents with deep or shallow strategy',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'merge', 'combine'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  // 双份输入：text 是基础 JSON，textB 待并入的那份（由 extraInputs 渲染）
  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode', 'prefer'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
