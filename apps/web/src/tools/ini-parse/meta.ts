import type { ToolMeta } from '@toolbox/catalog'

/**
 * ini-parse —— 全局编号 #156
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：纯 JS 自实现，deps 为空，支持范围见 README「限制」。
 */
export const meta: ToolMeta = {
  id: 'ini-parse',
  slug: 'ini-parse',
  title: 'INI 解析',
  description: 'INI 与 JSON 双向互转，支持小节、注释与引号值',
  titleEn: 'INI Parser',
  descriptionEn:
    'Convert INI and JSON in both directions, with sections, comments and quoted values',

  category: 'data-format',
  group: 'dev',
  tags: ['ini', 'json', 'config'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
