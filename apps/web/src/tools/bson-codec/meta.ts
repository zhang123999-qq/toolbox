import type { ToolMeta } from '@toolbox/catalog'

/**
 * bson-codec —— 全局编号 #175
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'bson-codec',
  slug: 'bson-codec',
  title: 'BSON 编解码',
  description: 'BSON 常用类型编解码：JSON 与 BSON 字节互转，输出 hex / base64 与 JSON 预览',
  titleEn: 'BSON Codec',
  descriptionEn:
    'BSON codec for common types: convert between JSON and BSON bytes with hex / base64 output',

  category: 'data-format',
  group: 'dev',
  tags: ['bson', 'mongodb', 'binary', 'json'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
