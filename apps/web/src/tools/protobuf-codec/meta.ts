import type { ToolMeta } from '@toolbox/catalog'

/**
 * protobuf-codec —— 全局编号 #173
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：原规划可行性 B（protobufjs / wasm），受「不新增依赖、不引入 wasm」约束降级为纯 JS 的
 *       结构解析 + 手工字段值编码演示，故 feasibility 记 A。
 */
export const meta: ToolMeta = {
  id: 'protobuf-codec',
  slug: 'protobuf-codec',
  title: 'Protobuf 编解码',
  description: '解析 .proto 定义的 message 结构，并对手动输入的字段值做 varint / zigzag 编码演示',
  titleEn: 'Protobuf Codec',
  descriptionEn:
    'Parse .proto message structures and demo varint / zigzag encoding of field values',

  category: 'data-format',
  group: 'dev',
  tags: ['protobuf', 'proto', 'varint', 'zigzag'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'values'],
  outputs: ['text'],
  options: ['mode', 'target', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
