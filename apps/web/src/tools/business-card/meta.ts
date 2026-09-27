import type { ToolMeta } from '@toolbox/catalog'

/**
 * business-card —— 全局编号 #408
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 名片生成：填写姓名/职位/联系方式 → 输出可直接使用的 SVG 矢量名片代码（纯 JS）
 */
export const meta: ToolMeta = {
  id: 'business-card',
  slug: 'business-card',
  title: '名片生成',
  description: '填写姓名、职位与联系方式，生成标准尺寸 SVG 矢量名片代码',
  titleEn: 'Business Card Generator',
  descriptionEn:
    'Enter your name, title and contact info to generate a standard-size SVG vector business card',

  category: 'random',
  group: 'design',
  tags: ['business-card', 'vcard', 'svg', 'generator'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'title', 'company', 'phone', 'email', 'website'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
