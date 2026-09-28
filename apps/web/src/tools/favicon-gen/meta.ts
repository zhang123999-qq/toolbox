import type { ToolMeta } from '@toolbox/catalog'

/**
 * favicon-gen —— 全局编号 #628
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P0｜可行性：A｜模板：T3
 * Favicon 多尺寸生成：上传图片 → canvas 缩放为 16/32/48/180/192/512 六种尺寸 →
 * fflate 打包 zip 下载，也支持单个 PNG 下载。
 */
export const meta: ToolMeta = {
  id: 'favicon-gen',
  slug: 'favicon-gen',
  title: 'Favicon 生成',
  description: '上传图片生成多尺寸 favicon（16/32/48/180/192/512）：打包 zip 一键下载，也可单独下载某个尺寸',
  titleEn: 'Favicon Multi-Size Generator',
  descriptionEn:
    'Upload an image to generate multi-size favicons (16/32/48/180/192/512): download as a zip or individual PNGs',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'favicon', 'png', 'icon'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['file'],
  options: ['sizes'],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}
