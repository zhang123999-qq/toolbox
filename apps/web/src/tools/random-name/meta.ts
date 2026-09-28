import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-name —— 全局编号 #374
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 随机人名：内置中英文常见姓名字库，可指定性别与语言，用 crypto.getRandomValues 选取
 */
export const meta: ToolMeta = {
  id: 'random-name',
  slug: 'random-name',
  title: '随机人名',
  description: '随机生成中文 / 英文人名，可指定性别（男 / 女 / 随机）与数量，内置常见姓名字库',
  titleEn: 'Random Name',
  descriptionEn:
    'Generate random Chinese / English names with selectable gender (male / female / random) and count, built on a curated name dictionary',

  category: 'random',
  group: 'design',
  tags: ['name', 'random', 'chinese', 'english', 'fake'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'gender', 'language'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
