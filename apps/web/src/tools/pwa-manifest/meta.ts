import type { ToolMeta } from '@toolbox/catalog'

/**
 * pwa-manifest —— 全局编号 #629
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * PWA Manifest 生成：填写 name / short_name / start_url / display /
 * theme_color / background_color / icons 表单，输出 manifest.json 文件内容。
 */
export const meta: ToolMeta = {
  id: 'pwa-manifest',
  slug: 'pwa-manifest',
  title: 'PWA Manifest',
  description: '生成 PWA 应用清单：填写名称、启动地址、主题色、图标等，输出 manifest.json 文件内容',
  titleEn: 'PWA Manifest Generator',
  descriptionEn:
    'Generate a PWA manifest: fill in name, start URL, theme colors and icons to output manifest.json content',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'pwa', 'manifest'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['shortName', 'startUrl', 'display', 'themeColor', 'backgroundColor', 'icons'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
