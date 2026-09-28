import type { ToolMeta } from '@toolbox/catalog'

/**
 * embedding —— 全局编号 #596
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS 特征哈希）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'embedding',
  slug: 'embedding',
  title: '文本嵌入',
  description: '特征哈希确定性嵌入：文本转固定维度归一化向量，纯本地计算',
  titleEn: 'Text Embedding',
  descriptionEn: 'Deterministic feature-hashing text embedding to normalized vectors, fully local',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'embedding', 'vector', 'hash', 'local'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['dim'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
