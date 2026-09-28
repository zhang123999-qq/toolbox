import type { ToolMeta } from '@toolbox/catalog'

/**
 * body-fat —— 全局编号 #358
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T2
 * 体脂计算：美国海军法估算体脂率
 */
export const meta: ToolMeta = {
  id: 'body-fat',
  slug: 'body-fat',
  title: '体脂计算',
  description: '用美国海军法估算体脂率',
  titleEn: 'Body Fat Calculator',
  descriptionEn: 'Estimate body fat percentage with the U.S. Navy method',

  category: 'math',
  group: 'life',
  tags: ['body-fat', 'health', 'fitness'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['gender'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
