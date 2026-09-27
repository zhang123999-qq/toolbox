import type { ToolMeta } from '@toolbox/catalog'

/**
 * wheel —— 全局编号 #412
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 转盘：选项列表渲染为彩色转盘，点击开始后 CSS 旋转动画落到随机获奖者；不引入动画库
 */
export const meta: ToolMeta = {
  id: 'wheel',
  slug: 'wheel',
  title: '转盘',
  description: '转盘抽奖：选项变为彩色扇区，点击开始后转盘旋转并停在随机获奖者上（纯 CSS 动画）',
  titleEn: 'Prize Wheel',
  descriptionEn:
    'Spin-the-wheel lottery: options become colored segments and the wheel spins to a random winner (pure CSS animation)',

  category: 'random',
  group: 'design',
  tags: ['random', 'wheel', 'lottery', 'spin'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'winners'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
