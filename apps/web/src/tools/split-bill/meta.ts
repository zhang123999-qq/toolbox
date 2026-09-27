import type { ToolMeta } from '@toolbox/catalog'

/**
 * split-bill —— 全局编号 #352
 * 域：math（数学 / 单位 / 金融）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * AA 分账：多人平摊消费总额，支持叠加小费
 */
export const meta: ToolMeta = {
  id: 'split-bill',
  slug: 'split-bill',
  title: 'AA 分账',
  description: '多人 AA，含小费的人均分摊',
  titleEn: 'Bill Splitter',
  descriptionEn: 'Split the bill evenly among people, with optional tip',

  category: 'math',
  group: 'life',
  tags: ['split', 'bill', 'aa'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['tipRate'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
