import type { ToolMeta } from '@toolbox/catalog'

/**
 * word-view —— 全局编号 #501
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P0｜可行性：A｜模板：T3
 * 来源：docs/catalog 工具规划 #501
 *
 * 实现说明：规划原要求 @neo-office/renderer 做高保真排版预览，
 * 但该包把 WASM 初始化地址硬编码为 /wasm/init.js，而仓库约束
 * 「只允许修改工具目录、不得复制静态资源」，无法实际初始化。
 * 故回退为 mammoth 的 HTML 语义预览（feasibility='A'、wasm=false）。
 */
export const meta: ToolMeta = {
  id: 'word-view',
  slug: 'word-view',
  title: 'Word 文档预览',
  description: '上传 .docx 文档，在浏览器本地渲染为可阅读的 HTML 预览，图片可内嵌显示',
  titleEn: 'Word Viewer',
  descriptionEn: 'Preview .docx documents as readable HTML locally in the browser, with images',

  category: 'media',
  group: 'design',
  tags: ['word', 'docx', 'preview', 'office'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['html'],
  options: [],

  deps: ['mammoth'],
  worker: false,
  wasm: false,
  api: false,
}
