import type { ToolMeta } from '@toolbox/catalog'

/**
 * gradient-gen-dev —— 全局编号 #235
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * CSS 渐变生成
 */
export const meta: ToolMeta = {
  id: 'gradient-gen-dev',
  slug: 'gradient-gen-dev',
  title: '渐变生成',
  description: '生成 linear / radial / conic CSS 渐变背景，多色标定位',
  titleEn: 'Gradient Generator',
  descriptionEn: 'Generate linear / radial / conic CSS gradients with multiple color stops',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'gradient', 'background', 'generator'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'angle', 'color1', 'pos1', 'color2', 'pos2', 'color3', 'pos3'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
