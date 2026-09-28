import type { ToolMeta } from '@toolbox/catalog'

/**
 * base64-to-image —— 全局编号 #476
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 单向「Base64 → 图片」：粘贴 Base64 文本（完整 DataURL 或纯 base64 字符串）→
 * 本地 atob 解码 → 魔数推断 MIME → loadImageFromBlob 校验为有效图片 →
 * 预览 → 可选 PNG/JPEG 输出下载。全程不上传。
 * 与相近工具的边界：
 * - #427 image-base64（双向互转）：本工具是单向「Base64→图片」独立入口，
 *   专注粘贴解码下载；#427 是双向一体版。
 * - #475 image-to-base64（图片→Base64）：与本工具方向相反，互为逆操作。
 */
export const meta: ToolMeta = {
  id: 'base64-to-image',
  slug: 'base64-to-image',
  title: 'Base64 转图片',
  description:
    '粘贴 Base64 文本解码为图片：支持完整 DataURL 或纯 Base64 字符串，本地预览并下载为 PNG/JPEG，全程不上传',
  titleEn: 'Base64 to Image',
  descriptionEn:
    'Decode pasted Base64 text into an image: full DataURL or raw Base64, preview locally and download as PNG/JPEG, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'base64', 'decode', 'data-url', 'png'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['file'],
  options: ['format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
