import type { ToolMeta } from '@toolbox/catalog'

/**
 * poster —— 全局编号 #409
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 海报生成：标题/副标题/正文/落款 + 主题配色 → 预览海报并导出 PNG
 */
export const meta: ToolMeta = {
  id: 'poster',
  slug: 'poster',
  title: '海报生成',
  description: '填写标题与正文，选择主题配色，实时预览并导出 PNG 海报',
  titleEn: 'Poster Generator',
  descriptionEn:
    'Enter a title and body text, pick a color theme, preview the poster and export it as PNG',

  category: 'random',
  group: 'design',
  tags: ['poster', 'design', 'generator'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'title', 'subtitle', 'footer'],
  outputs: ['text'],
  options: ['theme'],

  deps: ['html-to-image'],
  worker: false,
  wasm: false,
  api: false,
}
