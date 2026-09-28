import type { ToolMeta } from '@toolbox/catalog'

/**
 * blob-gen —— 全局编号 #393
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 随机 Blob 形状：圆周取点随机半径偏移，二次贝塞尔平滑闭合，输出 SVG
 */
export const meta: ToolMeta = {
  id: 'blob-gen',
  slug: 'blob-gen',
  title: 'Blob 形状生成',
  description: '用贝塞尔曲线生成随机 blob 有机形状，复杂度/平滑度/颜色可调，输出 SVG',
  titleEn: 'Blob Shape Generator',
  descriptionEn:
    'Generate random organic blob shapes with bezier curves; tune complexity / smoothness / colors, output SVG',

  category: 'random',
  group: 'design',
  tags: ['svg', 'blob', 'shape', 'design'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['complexity', 'smoothness', 'fillColor', 'strokeColor', 'strokeWidth'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
