import type { ToolMeta } from '@toolbox/catalog'

/**
 * messagepack —— 全局编号 #174
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'messagepack',
  slug: 'messagepack',
  title: 'MessagePack',
  description: 'MessagePack 编解码：JSON 与 MessagePack 字节互转，输出 hex / base64 与 JSON 预览',
  titleEn: 'MessagePack',
  descriptionEn:
    'MessagePack codec: convert between JSON and MessagePack bytes with hex / base64 output',

  category: 'data-format',
  group: 'dev',
  tags: ['messagepack', 'binary', 'json', 'serialization'],

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
