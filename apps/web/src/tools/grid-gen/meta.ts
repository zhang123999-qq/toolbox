import type { ToolMeta } from '@toolbox/catalog'

/**
 * grid-gen —— 全局编号 #395
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 生成网格背景纹理 SVG：点阵 / 直线网格 / 斜纹
 */
export const meta: ToolMeta = {
  id: 'grid-gen',
  slug: 'grid-gen',
  title: '网格生成',
  description: '生成点阵 / 直线 / 斜纹三种网格背景纹理 SVG，可调间距与颜色',
  titleEn: 'Grid Generator',
  descriptionEn:
    'Generate dot / line / diagonal grid background SVG textures with adjustable spacing and colors',

  category: 'random',
  group: 'design',
  tags: ['grid', 'svg', 'pattern', 'texture', 'background'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pattern', 'spacing', 'width', 'height', 'fgColor', 'bgColor'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
