import type { ToolMeta } from '@toolbox/catalog'

/**
 * palette —— 全局编号 #390
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 调色板：按基础色与配色模式在 Oklch 空间生成和谐色板，并导出为 CSS / SCSS / JSON / Tailwind 格式
 * 与 color-palette-gen 的定位区分：本工具侧重「导出多种代码格式」
 */
export const meta: ToolMeta = {
  id: 'palette',
  slug: 'palette',
  title: '调色板导出',
  description:
    '按基础色生成和谐调色板并导出为 CSS / SCSS / JSON / Tailwind 格式，经 culori 在 Oklch 空间计算',
  titleEn: 'Palette Export',
  descriptionEn:
    'Generate a harmonious color palette from a base color and export it as CSS / SCSS / JSON / Tailwind, computed in Oklch via culori',

  category: 'random',
  group: 'design',
  tags: ['palette', 'color', 'css', 'tailwind', 'export'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'count', 'format'],

  deps: ['culori'],
  worker: false,
  wasm: false,
  api: false,
}
