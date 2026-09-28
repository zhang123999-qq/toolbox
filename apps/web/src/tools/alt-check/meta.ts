import type { ToolMeta } from '@toolbox/catalog'

/**
 * alt-check —— 全局编号 #658
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 *
 * 纯本地解析 HTML 中的 img：alt 缺失 / 为空 / 过长 / 疑似文件名 /
 * 关键词堆砌检查，统计通过率并逐项给建议。
 */
export const meta: ToolMeta = {
  id: 'alt-check',
  slug: 'alt-check',
  title: '图片 Alt 检查',
  description: '检查页面图片的 alt 缺失、为空、过长、疑似文件名与关键词堆砌，统计通过率',
  titleEn: 'Image Alt Checker',
  descriptionEn: 'Audit img alt attributes: missing, empty, too long, filename-like or keyword-stuffed, with pass rate',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'alt', 'image'],

  priority: 'P1',
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
