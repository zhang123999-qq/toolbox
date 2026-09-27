import type { ToolMeta } from '@toolbox/catalog'

/**
 * angle —— 全局编号 #324
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 角度换算：度/弧度/梯度/圈等角度单位互转
 */
export const meta: ToolMeta = {
  id: 'angle',
  slug: 'angle',
  title: '角度换算',
  description: '度/弧度/梯度/圈等角度单位互转',
  titleEn: 'Angle Converter',
  descriptionEn: 'Convert between angle units: degrees, radians, gradians, turns, arcmin and more',

  category: 'math',
  group: 'life',
  tags: ['angle', 'unit', 'convert'],

  priority: 'P1',
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
