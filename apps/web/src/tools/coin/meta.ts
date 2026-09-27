import type { ToolMeta } from '@toolbox/catalog'

/**
 * coin —— 全局编号 #415
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 硬币：抛硬币，CSS 3D 翻转动画；支持一次抛多枚并统计正反面
 */
export const meta: ToolMeta = {
  id: 'coin',
  slug: 'coin',
  title: '硬币',
  description: '抛硬币：CSS 3D 翻转动画开奖，可一次抛多枚并统计正面 / 反面次数',
  titleEn: 'Coin Flip',
  descriptionEn:
    'Flip a coin with a pure-CSS 3D flip animation; flip many at once and tally heads vs tails',

  category: 'random',
  group: 'design',
  tags: ['random', 'coin', 'flip', 'heads-tails'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
