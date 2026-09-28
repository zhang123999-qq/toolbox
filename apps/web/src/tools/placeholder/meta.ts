import type { ToolMeta } from '@toolbox/catalog'

/**
 * placeholder —— 全局编号 #387
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 占位图生成：按尺寸生成灰色 SVG 占位图，常用于前端开发占位
 */
export const meta: ToolMeta = {
  id: 'placeholder',
  slug: 'placeholder',
  title: '占位图生成',
  description: '输入尺寸（如 300x200）生成 SVG 占位图，可自定义背景色、文字颜色与显示文字',
  titleEn: 'Placeholder Image Generator',
  descriptionEn:
    'Generate an SVG placeholder image from a size like 300x200, with custom background, text color and label',

  category: 'random',
  group: 'design',
  tags: ['placeholder', 'svg', 'image', 'dev'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['bgColor', 'fgColor', 'customText'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
