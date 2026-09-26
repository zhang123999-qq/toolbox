import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-workbench —— 全局编号 #188
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'data-workbench',
  slug: 'data-workbench',
  title: '数据转换工作台',
  description: '按步骤串依次为数据套用多步转换（大小写、去空白、JSON 与 YAML 互转、编码等）',
  titleEn: 'Data Workbench',
  descriptionEn: 'Chain multiple conversions on your data (case, whitespace, JSON/YAML, encodings)',

  category: 'data-format',
  group: 'dev',
  tags: ['pipeline', 'convert', 'json', 'yaml'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['steps', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
