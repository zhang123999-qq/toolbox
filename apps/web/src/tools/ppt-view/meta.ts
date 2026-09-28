import type { ToolMeta } from '@toolbox/catalog'

/**
 * ppt-view —— 全局编号 #503
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P0｜可行性：A｜模板：T3
 * 来源：docs/catalog 工具规划 #503
 *
 * 实现说明：规划原要求 @neo-office/renderer 做高保真幻灯片预览，
 * 但该包把 WASM 初始化地址硬编码为 /wasm/init.js，而仓库约束
 * 「只允许修改工具目录、不得复制静态资源」，无法实际初始化。
 * 故回退为 fflate 解包 + 提取幻灯片文本的简化预览
 * （feasibility='A'、wasm=false）。
 */
export const meta: ToolMeta = {
  id: 'ppt-view',
  slug: 'ppt-view',
  title: 'PPT 幻灯片预览',
  description: '上传 .pptx 文件，在浏览器本地按幻灯片提取文本预览，支持逐张切换',
  titleEn: 'PPT Viewer',
  descriptionEn: 'Preview .pptx files slide by slide as extracted text locally in the browser',

  category: 'media',
  group: 'design',
  tags: ['ppt', 'pptx', 'preview', 'slides', 'office'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}
