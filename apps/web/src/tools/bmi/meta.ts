import type { ToolMeta } from '@toolbox/catalog'

/**
 * bmi —— 全局编号 #356
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * BMI 计算：身体质量指数与健康分级（中国标准）
 */
export const meta: ToolMeta = {
  id: 'bmi',
  slug: 'bmi',
  title: 'BMI 计算',
  description: '算身体质量指数与健康分级',
  titleEn: 'BMI Calculator',
  descriptionEn: 'Calculate body mass index and health classification',

  category: 'math',
  group: 'life',
  tags: ['bmi', 'health', 'weight'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
