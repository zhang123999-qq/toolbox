import type { ToolMeta } from '@toolbox/catalog'

/**
 * uuid —— 全局编号 #376
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 用 crypto.randomUUID() 生成 RFC 4122 v4 UUID，可批量、可选大写、可选去横线。
 */
export const meta: ToolMeta = {
  id: 'uuid',
  slug: 'uuid',
  title: 'UUID 生成',
  description: '用加密安全随机数生成 RFC 4122 v4 UUID，支持批量、大写与去横线选项',
  titleEn: 'UUID Generator',
  descriptionEn:
    'Generate RFC 4122 v4 UUIDs with crypto.randomUUID(): batch, uppercase and no-hyphen options',

  category: 'random',
  group: 'design',
  tags: ['uuid', 'guid', 'random', 'identifier'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'uppercase', 'hyphens'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
