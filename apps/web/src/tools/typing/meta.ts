import type { ToolMeta } from '@toolbox/catalog'

/**
 * typing —— 全局编号 #831
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'typing',
  slug: 'typing',
  title: '打字练习',
  description: '打字速度（WPM）与准确率统计：逐字对比目标文本与输入文本',
  titleEn: 'Typing Practice',
  descriptionEn:
    'Typing speed (WPM) and accuracy stats: char-by-char diff of target vs typed text',

  category: 'education',
  group: 'life',
  tags: ['typing', 'wpm', 'practice', 'education'],

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
