import type { ToolMeta } from '@toolbox/catalog'

/**
 * avro-parse —— 全局编号 #176
 * 域：data-format（数据格式）｜大组：dev｜优先级：P3｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'avro-parse',
  slug: 'avro-parse',
  title: 'Avro 解析',
  description: '解析 Avro Schema（JSON）的字段结构，输出字段树、类型统计与 JSON Schema 粗略映射',
  titleEn: 'Avro Parse',
  descriptionEn:
    'Parse an Avro schema into a field tree with type stats and a rough JSON Schema mapping',

  category: 'data-format',
  group: 'dev',
  tags: ['avro', 'schema', 'json-schema', 'hadoop'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
