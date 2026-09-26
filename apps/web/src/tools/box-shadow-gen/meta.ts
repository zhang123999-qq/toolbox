import type { ToolMeta } from '@toolbox/catalog'

/**
 * box-shadow-gen —— 全局编号 #236
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * CSS 阴影生成
 */
export const meta: ToolMeta = {
  id: 'box-shadow-gen',
  slug: 'box-shadow-gen',
  title: '阴影生成',
  description: '配置偏移/模糊/扩散/颜色，生成 box-shadow CSS',
  titleEn: 'Box Shadow Generator',
  descriptionEn: 'Configure offset / blur / spread / color and generate box-shadow CSS',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'shadow', 'box-shadow', 'generator'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['offsetX', 'offsetY', 'blur', 'spread', 'color', 'inset'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
