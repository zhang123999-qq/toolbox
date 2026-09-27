import type { ToolMeta } from '@toolbox/catalog'

/**
 * geometry —— 全局编号 #342
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 几何计算：常见平面图形与立体图形的周长 / 面积 / 表面积 / 体积
 */
export const meta: ToolMeta = {
  id: 'geometry',
  slug: 'geometry',
  title: '几何计算',
  description: '常见平面与立体图形的周长、面积、表面积、体积计算，附计算公式',
  titleEn: 'Geometry Calculator',
  descriptionEn:
    'Perimeter, area, surface area and volume for common 2D/3D shapes, with the formulas used',

  category: 'math',
  group: 'life',
  tags: ['math', 'geometry', 'area', 'volume'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['shape'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
