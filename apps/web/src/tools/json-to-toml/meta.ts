import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-toml —— 全局编号 #149
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-toml',
  slug: 'json-to-toml',
  title: 'JSON 转 TOML',
  description: '把 JSON 对象转成 TOML 配置',
  titleEn: 'JSON to TOML',
  descriptionEn: 'Convert a JSON object into TOML configuration',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'toml', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['style'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
