import type { ToolMeta } from '@toolbox/catalog'

/**
 * fortune —— 全局编号 #841
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 传统求签：签文库抽签，含签号、吉凶、签文与解曰。
 * 与 lottery（名单抽奖）差异化：本工具是传统求签签文，非从名单中抽取中奖者。
 */
export const meta: ToolMeta = {
  id: 'fortune',
  slug: 'fortune',
  title: '抽签',
  description: '传统求签：签文抽签，含吉凶、签诗与解曰（非 lottery 名单抽奖）',
  titleEn: 'Fortune Sticks',
  descriptionEn: 'Traditional fortune stick divination with verses and interpretations (for fun)',

  category: 'education',
  group: 'life',
  tags: ['fortune', 'divination', 'fun', 'sticks'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
