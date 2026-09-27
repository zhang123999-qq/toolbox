import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-group —— 全局编号 #416
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 随机分组：把名单随机分成 N 组，Fisher-Yates 洗牌后按「前余数组多一人」均衡分配
 */
export const meta: ToolMeta = {
  id: 'random-group',
  slug: 'random-group',
  title: '随机分组',
  description: '把名单随机分成 N 组：Fisher-Yates 洗牌后均衡分配，组间人数最多差 1 人',
  titleEn: 'Random Grouping',
  descriptionEn:
    'Split a name list randomly into N balanced groups: Fisher-Yates shuffle, group sizes differ by at most one',

  category: 'random',
  group: 'design',
  tags: ['random', 'group', 'shuffle', 'team'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['groups'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
