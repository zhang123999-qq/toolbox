import type { ToolMeta } from '@toolbox/catalog'

/**
 * trigonometry —— 全局编号 #343
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 三角函数：给定角度（度 / 弧度），一次性输出六个三角函数值
 */
export const meta: ToolMeta = {
  id: 'trigonometry',
  slug: 'trigonometry',
  title: '三角函数',
  description: '输入角度（度或弧度），一次性求 sin、cos、tan、csc、sec、cot 六个三角函数值',
  titleEn: 'Trigonometry',
  descriptionEn:
    'Enter an angle in degrees or radians and get all six trig functions: sin, cos, tan, csc, sec, cot',

  category: 'math',
  group: 'life',
  tags: ['math', 'trigonometry', 'angle', 'sin-cos'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['unit'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
