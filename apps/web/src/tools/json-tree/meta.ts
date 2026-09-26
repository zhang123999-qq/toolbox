import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-tree —— 全局编号 #134
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-tree',
  slug: 'json-tree',
  title: 'JSON 树形查看',
  description: '以缩进树形展示 JSON 结构，列出每个节点的类型与取值',
  titleEn: 'JSON Tree',
  descriptionEn: 'Render JSON as an indented tree with the type and value of every node',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'tree', 'viewer'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  // T2 只输出文本：树形是「缩进 + 类型标注」的纯文本，不另造 T3 布局
  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'sortKeys'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
