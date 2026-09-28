import type { ToolMeta } from '@toolbox/catalog'

/**
 * wave-gen —— 全局编号 #394
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 多层正弦波叠加生成波浪 SVG，颜色从 color1 渐变到 color2，半透明填充
 */
export const meta: ToolMeta = {
  id: 'wave-gen',
  slug: 'wave-gen',
  title: '波浪生成',
  description: '用多层正弦波叠加生成波浪 SVG，可调振幅、频率、层数与渐变色',
  titleEn: 'Wave Generator',
  descriptionEn:
    'Generate layered sine-wave SVG art with adjustable amplitude, frequency, layers and gradient colors',

  category: 'random',
  group: 'design',
  tags: ['wave', 'svg', 'sine', 'gradient', 'art'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['amplitude', 'frequency', 'layers', 'color1', 'color2'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
