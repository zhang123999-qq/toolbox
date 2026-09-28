import type { ToolMeta } from '@toolbox/catalog'

/**
 * svg-gen —— 全局编号 #392
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * SVG 几何图案生成：点阵 / 条纹 / 棋盘格 / 波浪 / 网格，输出完整 SVG 代码
 */
export const meta: ToolMeta = {
  id: 'svg-gen',
  slug: 'svg-gen',
  title: 'SVG 图案生成',
  description: '选择点阵/条纹/棋盘/波浪/网格图案与尺寸配色，输出完整 SVG 代码',
  titleEn: 'SVG Pattern Generator',
  descriptionEn:
    'Pick dots / lines / checker / waves / grid pattern with size and colors, output full SVG code',

  category: 'random',
  group: 'design',
  tags: ['svg', 'pattern', 'background', 'design'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pattern', 'width', 'height', 'fgColor', 'bgColor', 'spacing'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
