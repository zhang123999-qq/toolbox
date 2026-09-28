import type { ToolMeta } from '@toolbox/catalog'

/**
 * avatar —— 全局编号 #384
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 头像生成：基于用户名种子生成 SVG 头像（首字母 / 几何 / 渐变三种样式）
 */
export const meta: ToolMeta = {
  id: 'avatar',
  slug: 'avatar',
  title: '头像生成',
  description: '输入用户名生成 SVG 头像：首字母、几何图案、渐变三种样式，可自定义尺寸与背景色',
  titleEn: 'Avatar Generator',
  descriptionEn:
    'Generate an SVG avatar from a username: initials, geometric or gradient style, with custom size and background color',

  category: 'random',
  group: 'design',
  tags: ['avatar', 'svg', 'initials', 'generator'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['size', 'style', 'bgColor'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
