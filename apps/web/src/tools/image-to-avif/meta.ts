import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-to-avif —— 全局编号 #478
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 *
 * 一键把图片转成 AVIF：本地 Canvas toBlob('image/avif') 重编码，质量 1–100 可调（默认 80），
 * 可选限制最大边。显示原图 vs AVIF 的预览、体积、体积占比、尺寸，一键下载。
 *
 * 与相近工具的边界：
 *  • vs #426 image-convert（通用格式互转）：#426 的实现是「AVIF 仅输入、输出 JPEG/PNG/WebP」，
 *    本工具是专项一键「转 AVIF」输出（AVIF 仅输出）；
 *  • vs #421 image-compress（图片压缩）：#421 输出 JPEG/PNG/WebP，本工具固定输出 AVIF。
 *
 * 特性检测（硬性要求）：浏览器对 canvas.toBlob('image/avif') 的支持不一。
 * 处理前先对 1×1 小 canvas 调用 toBlob('image/avif') 探测；返回 null 或抛错 →
 * 明确报错「当前浏览器不支持 AVIF 编码」，不静默失败、不输出坏文件。
 *
 * 可行性：文档标 B，实际为纯 Canvas 实现（无 wasm、无后端、无新依赖），故标 A；
 * AVIF 编码依赖浏览器支持，已做特性检测 + 明确提示兜底。
 */
export const meta: ToolMeta = {
  id: 'image-to-avif',
  slug: 'image-to-avif',
  title: '图片转 AVIF',
  description: '一键把图片转为 AVIF：质量 1–100 可调，可选限制最大边，全程不上传',
  titleEn: 'Image to AVIF',
  descriptionEn:
    'Convert images to AVIF in one click: adjustable quality 1–100, optional max-dimension limit, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'avif', 'convert', 'compress'],

  priority: 'P2',
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
