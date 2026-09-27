import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-decision —— 全局编号 #410
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 随机决定：从选项列表（每行一个）中随机抽取指定个数；可选允许重复，结果无偏
 */
export const meta: ToolMeta = {
  id: 'random-decision',
  slug: 'random-decision',
  title: '随机决定',
  description: '选择困难症终结者：从选项列表中随机抽取一个或多个，可选允许重复抽中同一项',
  titleEn: 'Random Decision',
  descriptionEn:
    'End decision paralysis: randomly pick one or more options from a list, optionally allowing repeats',

  category: 'random',
  group: 'design',
  tags: ['random', 'decision', 'pick', 'choice'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'count'],
  outputs: ['text'],
  options: ['allowRepeat'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
