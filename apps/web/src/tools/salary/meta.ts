import type { ToolMeta } from '@toolbox/catalog'

/**
 * salary —— 全局编号 #353
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T2
 * 工资计算：税前月薪算社保/公积金个人缴纳、个税与税后到手工资
 */
export const meta: ToolMeta = {
  id: 'salary',
  slug: 'salary',
  title: '工资计算',
  description: '税前月薪算五险一金、个税与到手工资',
  titleEn: 'Salary Calculator',
  descriptionEn:
    'Compute social insurance, housing fund, income tax and take-home pay from gross monthly salary',

  category: 'math',
  group: 'life',
  tags: ['salary', 'payroll', 'tax'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['socialRate', 'fundRate'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
