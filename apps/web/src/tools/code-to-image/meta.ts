import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-to-image —— 全局编号 #241
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 * 用 canvas 把代码绘制成 PNG 数据 URL
 */
export const meta: ToolMeta = {
  id: 'code-to-image',
  slug: 'code-to-image',
  title: '代码转图片',
  description: '用 canvas 把代码绘制为 PNG 图片（数据 URL），支持明暗主题与字号',
  titleEn: 'Code to Image',
  descriptionEn: 'Render code to a PNG data URL on canvas, with dark/light themes and font size',

  category: 'devops',
  group: 'dev',
  tags: ['code', 'image', 'canvas', 'png', 'screenshot'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['theme', 'language', 'fontSize'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
