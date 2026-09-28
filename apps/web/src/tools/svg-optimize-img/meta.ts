import type { ToolMeta } from '@toolbox/catalog'

/**
 * svg-optimize-img —— 全局编号 #452
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * SVG 优化压缩：本地用 svgo（纯 JS，无 wasm）压缩 .svg 文件——去注释、
 * 冗余属性与空白，可选多轮优化与格式化输出；显示压缩前后字节数与压缩率，
 * 可下载优化后的 .svg，全程不上传。
 */
export const meta: ToolMeta = {
  id: 'svg-optimize-img',
  slug: 'svg-optimize-img',
  title: 'SVG 优化压缩',
  description: '本地用 svgo 压缩 SVG：去注释与冗余属性，显示压缩率，一键下载，全程不上传',
  titleEn: 'SVG Optimize & Compress',
  descriptionEn:
    'Optimize SVG locally with svgo: strip comments and redundant attributes, show the ratio, one-click download, no upload',

  category: 'image',
  group: 'design',
  tags: ['svg', 'optimize', 'compress'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['multipass', 'pretty'],

  deps: ['svgo'],
  worker: false,
  wasm: false,
  api: false,
}
