import type { ToolMeta } from '@toolbox/catalog'

/**
 * gif-split —— 全局编号 #442
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜模板：T2
 * GIF 分解帧：用 gifuct-js 解析每一帧，逐帧预览，每帧可单独下载为 PNG。
 *
 * 可行性标注说明：规格文档（docs/tools/08-图片图形.md）将本工具标为可行性 B，
 * 但实际依赖 gifuct-js 是纯 JS 实现（无 WASM、无 Worker、无后端），
 * 按 #421 先例诚实标注为 A。
 */
export const meta: ToolMeta = {
  id: 'gif-split',
  slug: 'gif-split',
  title: 'GIF 分解',
  description: '把 GIF 逐帧分解：预览每一帧并单独下载为 PNG，全程本地不上传',
  titleEn: 'GIF Split',
  descriptionEn: 'Split a GIF into frames: preview each frame and download as PNG, all locally',

  category: 'image',
  group: 'design',
  tags: ['gif', 'split', 'frames', 'animation', 'image'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: [],

  deps: ['gifuct-js'],
  worker: false,
  wasm: false,
  api: false,
}
