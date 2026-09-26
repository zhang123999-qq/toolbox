import type { ToolMeta } from '@toolbox/catalog'

/**
 * autoprefixer —— 全局编号 #232
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 基于静态 caniuse 规则表自动加浏览器前缀
 */
export const meta: ToolMeta = {
  id: 'autoprefixer',
  slug: 'autoprefixer',
  title: 'CSS 前缀',
  description: '按静态规则表为 CSS 属性自动添加 -webkit-/-moz-/-ms- 浏览器前缀',
  titleEn: 'Autoprefixer',
  descriptionEn: 'Add vendor prefixes to CSS properties using a static caniuse rule table',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'autoprefixer', 'prefix', 'browser'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
