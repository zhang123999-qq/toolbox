import type { ToolMeta } from '@toolbox/catalog'

/**
 * toml-parse —— 全局编号 #155
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：纯 JS 自实现，deps 为空，支持范围见 README「限制」。
 */
export const meta: ToolMeta = {
  id: 'toml-parse',
  slug: 'toml-parse',
  title: 'TOML 解析',
  description: 'TOML 与 JSON 双向互转，支持表、数组表与内联表',
  titleEn: 'TOML Parser',
  descriptionEn:
    'Convert TOML and JSON in both directions, with tables, array tables and inline tables',

  category: 'data-format',
  group: 'dev',
  tags: ['toml', 'json', 'parse'],

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
