import type { ToolMeta } from '@toolbox/catalog'

/**
 * color-palette-gen —— 全局编号 #418
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 随机颜色板：按基础色与配色模式（单色 / 类似 / 互补 / 三角色…）生成和谐色板，
 * 色彩空间转换经 culori 在 Oklch 空间完成
 */
export const meta: ToolMeta = {
  id: 'color-palette-gen',
  slug: 'color-palette-gen',
  title: '随机颜色板',
  description:
    '按基础色生成和谐配色板：单色/类似/互补/三角色等模式，经 culori 在 Oklch 色彩空间计算',
  titleEn: 'Random Color Palette',
  descriptionEn:
    'Generate harmonious color palettes from a base color: monochromatic, analogous, complementary, triadic and more, computed in Oklch via culori',

  category: 'random',
  group: 'design',
  tags: ['color', 'palette', 'harmony', 'design'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'count'],

  deps: ['culori'],
  worker: false,
  wasm: false,
  api: false,
}
