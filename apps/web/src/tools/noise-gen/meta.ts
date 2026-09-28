import type { ToolMeta } from '@toolbox/catalog'

/**
 * noise-gen —— 全局编号 #396
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 自研 value noise + fBm 分形叠加，canvas 渲染噪声图像，支持灰度 / viridis / plasma 配色
 */
export const meta: ToolMeta = {
  id: 'noise-gen',
  slug: 'noise-gen',
  title: '噪声生成',
  description: '用自研 value noise + 分形叠加生成噪声纹理图，可调尺度、八度、种子与配色',
  titleEn: 'Noise Generator',
  descriptionEn:
    'Generate procedural value-noise textures with fBm; tune scale, octaves, seed and colormap',

  category: 'random',
  group: 'design',
  tags: ['noise', 'procedural', 'canvas', 'texture', 'fbm'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['scale', 'octaves', 'seed', 'colormap', 'width', 'height'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
