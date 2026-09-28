import type { ToolMeta } from '@toolbox/catalog'

/**
 * texture-pack —— 全局编号 #787
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'texture-pack',
  slug: 'texture-pack',
  title: '纹理打包',
  description: '用 shelf 装箱算法将多张小图打包为纹理图集，计算布局坐标与空间利用率并导出图集 JSON',
  titleEn: 'Texture Packer',
  descriptionEn:
    'Pack small images into a texture atlas with a shelf bin-packing algorithm; compute layout, utilization and export atlas JSON',

  category: 'game',
  group: 'design',
  tags: ['game', 'texture', 'atlas', 'sprite'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
