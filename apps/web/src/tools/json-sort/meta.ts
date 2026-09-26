import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-sort —— 全局编号 #135
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-sort',
  slug: 'json-sort',
  title: 'JSON 排序',
  description: '按键名递归排序，支持升序与降序，可选缩进输出',
  titleEn: 'JSON Sort',
  descriptionEn: 'Recursively sort object keys in ascending or descending order',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'sort', 'keys'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['descending', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
