import type { ToolMeta } from '@toolbox/catalog'

/**
 * flashcard —— 全局编号 #830
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'flashcard',
  slug: 'flashcard',
  title: '单词卡',
  description: '抽认卡学习工具：SM-2 简化版间隔重复算法，CSV 导入/JSON 导出',
  titleEn: 'Flashcards',
  descriptionEn:
    'Flashcard learning with simplified SM-2 spaced repetition; CSV import / JSON export',

  category: 'education',
  group: 'life',
  tags: ['flashcard', 'memory', 'learning', 'education'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
