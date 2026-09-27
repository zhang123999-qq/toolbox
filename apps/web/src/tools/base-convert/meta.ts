import type { ToolMeta } from '@toolbox/catalog'

/**
 * base-convert —— 全局编号 #313
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 进制转换：整数在 2/8/10/16/32/36 进制之间互转
 */
export const meta: ToolMeta = {
  id: 'base-convert',
  slug: 'base-convert',
  title: '进制转换',
  description: '整数在 2/8/10/16/32/36 进制之间互转',
  titleEn: 'Base Converter',
  descriptionEn: 'Convert integers between bases 2/8/10/16/32/36',

  category: 'math',
  group: 'life',
  tags: ['base', 'binary', 'hex'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['from', 'to'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
