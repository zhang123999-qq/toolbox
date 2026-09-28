import type { ToolMeta } from '@toolbox/catalog'

/**
 * shadow-gen —— 全局编号 #389
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * CSS box-shadow 生成：多层 / 彩色 / 霓虹 / 内阴影，偏移模糊扩散颜色可调
 */
export const meta: ToolMeta = {
  id: 'shadow-gen',
  slug: 'shadow-gen',
  title: '阴影生成',
  description: '配置层数/偏移/模糊/扩散/颜色/样式（柔和/彩色/霓虹/内阴影），生成 box-shadow CSS',
  titleEn: 'Box Shadow Generator',
  descriptionEn:
    'Configure layers / offset / blur / spread / color / style (soft / colored / neon / inset) and generate box-shadow CSS',

  category: 'random',
  group: 'design',
  tags: ['css', 'shadow', 'box-shadow', 'design'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['layers', 'offsetX', 'offsetY', 'blur', 'spread', 'color', 'style'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
