import type { ToolMeta } from '@toolbox/catalog'

/**
 * precision —— 全局编号 #370
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T2
 * 数值精度：浮点误差演示（0.1+0.2≠0.3）与修正，decimal.js 精确结果对照 JS 原生浮点
 */
export const meta: ToolMeta = {
  id: 'precision',
  slug: 'precision',
  title: '数值精度',
  description: '浮点误差演示与修正：decimal.js 精确结果对照 JS 原生浮点，定位 0.1+0.2 类陷阱',
  titleEn: 'Numeric Precision',
  descriptionEn:
    'Float error demo and fix: exact decimal.js result side-by-side with native JS float (the 0.1+0.2 trap)',

  category: 'math',
  group: 'life',
  tags: ['precision', 'decimal', 'float', 'math'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['operator'],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}
