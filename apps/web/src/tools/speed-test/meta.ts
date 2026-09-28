import type { ToolMeta } from '@toolbox/catalog'

/**
 * speed-test —— 全局编号 #648
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P3｜可行性：D｜模板：T2
 *
 * 浏览器 fetch 计时测速：总耗时 / TTFB 近似 / 传输体积，多次测量取平均。
 * 跨域时走 no-cors，只能测总耗时近似值，如实标注不编造。
 */
export const meta: ToolMeta = {
  id: 'speed-test',
  slug: 'speed-test',
  title: '网站速度测试',
  description: '浏览器内测速：多次 fetch 计时，总耗时/TTFB近似/体积取平均并打分',
  titleEn: 'Website Speed Test',
  descriptionEn: 'In-browser speed test: repeated fetch timing, avg total/TTFB/size with score',

  category: 'seo',
  group: 'dev',
  tags: ['speed', 'performance', 'seo', 'network'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['times'],

  deps: [],
  worker: false,
  wasm: false,
  // D：浏览器 fetch 直连目标站点（无后端、无 Key）
  api: true,
}
