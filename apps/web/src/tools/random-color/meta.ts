import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-color —— 全局编号 #373
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 随机颜色：随机色相、中等明度与彩度，经 culori 在 Oklch 空间生成，
 * 支持 hex / rgb / hsl 三种输出格式
 */
export const meta: ToolMeta = {
  id: 'random-color',
  slug: 'random-color',
  title: '随机颜色',
  description:
    '批量生成随机颜色值：随机色相、中等明度与彩度，支持 hex / rgb / hsl 格式，经 culori 在 Oklch 空间计算',
  titleEn: 'Random Color',
  descriptionEn:
    'Generate random colors in batch with random hue and medium lightness/chroma, in hex / rgb / hsl formats, computed in Oklch via culori',

  category: 'random',
  group: 'design',
  tags: ['color', 'random', 'hex', 'rgb', 'hsl'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'format'],

  deps: ['culori'],
  worker: false,
  wasm: false,
  api: false,
}
