import type { ToolMeta } from '@toolbox/catalog'

/**
 * ulid —— 全局编号 #378
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 按 ULID 规范生成：48bit 毫秒时间戳 + 80bit 随机数，Crockford Base32 编码，
 * 26 字符大写；时间戳取自 Date.now()，随机数取自 crypto.getRandomValues。
 */
export const meta: ToolMeta = {
  id: 'ulid',
  slug: 'ulid',
  title: 'ULID 生成',
  description:
    '按 ULID 规范生成可排序的随机 ID：48bit 毫秒时间戳 + 80bit 随机，Crockford Base32，26 字符大写',
  titleEn: 'ULID Generator',
  descriptionEn:
    'Generate sortable ULIDs: 48-bit millisecond timestamp + 80-bit randomness, Crockford Base32, 26 uppercase chars',

  category: 'random',
  group: 'design',
  tags: ['ulid', 'id', 'random', 'sortable'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
