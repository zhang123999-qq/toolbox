import type { ToolMeta } from '@toolbox/catalog'

/**
 * lottery —— 全局编号 #411
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 抽签：从名单（每行一人）中随机抽取 N 个中奖者；默认不放回，可切换为有放回
 */
export const meta: ToolMeta = {
  id: 'lottery',
  slug: 'lottery',
  title: '抽签',
  description: '从名单中随机抽取 N 个中奖者：默认不放回，可切换有放回（允许重复中奖）',
  titleEn: 'Lottery Draw',
  descriptionEn:
    'Draw N winners from a name list: without replacement by default, with-replacement mode allowed',

  category: 'random',
  group: 'design',
  tags: ['random', 'lottery', 'draw', 'winner'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'count'],
  outputs: ['text'],
  options: ['withReplacement'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
