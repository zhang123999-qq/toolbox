import type { ToolMeta } from '@toolbox/catalog'

/**
 * matrix —— 全局编号 #340
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 矩阵计算：加减乘、行列式、逆矩阵、转置（mathjs 运算引擎）
 */
export const meta: ToolMeta = {
  id: 'matrix',
  slug: 'matrix',
  title: '矩阵计算',
  description: '矩阵加减乘、行列式、逆矩阵与转置，支持任意行列，运算由 mathjs 完成',
  titleEn: 'Matrix Calculator',
  descriptionEn:
    'Matrix addition, subtraction, multiplication, determinant, inverse and transpose with the mathjs engine',

  category: 'math',
  group: 'life',
  tags: ['math', 'matrix', 'linear-algebra'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['operation'],

  deps: ['mathjs'],
  worker: false,
  wasm: false,
  api: false,
}
