import type { ToolMeta } from '@toolbox/catalog'

/**
 * yaml-to-xml —— 全局编号 #154
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：纯 JS 自实现，deps 为空，支持范围见 README「限制」。
 */
export const meta: ToolMeta = {
  id: 'yaml-to-xml',
  slug: 'yaml-to-xml',
  title: 'YAML 转 XML',
  description: '把 YAML 数据转成 XML 文档，键名即元素名',
  titleEn: 'YAML to XML',
  descriptionEn: 'Convert YAML data into an XML document where keys become element names',

  category: 'data-format',
  group: 'dev',
  tags: ['yaml', 'xml', 'convert'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
