import type { ToolMeta } from '@toolbox/catalog'

/**
 * logo —— 全局编号 #385
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * Logo 生成：左侧图标 + 右侧品牌文字的 SVG 组合，多种风格与配色
 */
export const meta: ToolMeta = {
  id: 'logo',
  slug: 'logo',
  title: 'Logo 生成',
  description:
    '输入品牌名生成 SVG Logo：左侧图标 + 右侧文字，支持极简 / 渐变 / 几何 / 徽章四种风格',
  titleEn: 'Logo Generator',
  descriptionEn:
    'Generate an SVG logo: an icon mark on the left plus brand text, in minimal / gradient / geometric / badge styles',

  category: 'random',
  group: 'design',
  tags: ['logo', 'svg', 'brand', 'icon'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['style', 'primaryColor', 'secondaryColor', 'iconShape'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
