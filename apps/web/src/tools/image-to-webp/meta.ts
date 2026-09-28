import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-to-webp —— 全局编号 #477
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 一键把图片转为 WebP：纯 Canvas toBlob 编码。文档原可行性 B（wasm-vips），
 * 本工具改用浏览器 Canvas 原生 WebP 编码即可覆盖，故降为 A。
 * 与相近工具的边界：
 * - vs #426 image-convert（通用格式互转：多格式输入 → JPEG/PNG/WebP 输出，
 *   可选质量）：本工具是专项一键「转 WebP」，参数聚焦 WebP 质量（1–100），
 *   无输出格式选项。
 * - vs #421 image-compress（按质量/格式压缩，输出格式三选一）：本工具固定
 *   输出 WebP，定位是「一键转 WebP」而非通用压缩。
 */
export const meta: ToolMeta = {
  id: 'image-to-webp',
  slug: 'image-to-webp',
  title: '图片转 WebP',
  description: '一键把图片转为 WebP：质量 1–100 可调，可选限制最大边，全程不上传',
  titleEn: 'Image to WebP',
  descriptionEn:
    'Convert images to WebP in one click: adjustable quality 1–100, optional max-dimension limit, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'webp', 'convert', 'compress'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['quality', 'maxDimension'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
