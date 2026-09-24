import type { ToolMeta } from '@toolbox/catalog'

/**
 * url-parser —— 全局编号 #182
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'url-parser',
  slug: 'url-parser',
  title: 'URL 解析',
  description: '拆解 URL 的协议、主机、端口、路径、查询参数与锚点',
  titleEn: 'URL Parser',
  descriptionEn: 'Break a URL into protocol, host, port, path, query and fragment',

  category: 'data-format',
  group: 'dev',
  tags: ['url', 'parse', 'query'],

  priority: 'P0',
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
