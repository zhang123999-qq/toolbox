import type { ToolMeta } from '@toolbox/catalog'

/**
 * ppt-to-image —— 全局编号 #506
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/catalog 工具规划 #506
 *
 * 实现说明：规划原要求 @neo-office/renderer 做高保真幻灯片渲染，
 * 但该包把 WASM 初始化地址硬编码为 /wasm/init.js，而仓库约束
 * 「只允许修改工具目录、不得复制静态资源」，无法实际初始化。
 * 故回退为 fflate 解包 + 提取幻灯片文本 + canvas 简化版式渲染
 * （feasibility='A'、wasm=false）。输出为每张幻灯片的 PNG（data URL）。
 */
export const meta: ToolMeta = {
  id: 'ppt-to-image',
  slug: 'ppt-to-image',
  title: 'PPT 转图片',
  description: '上传 .pptx 文件，将每张幻灯片渲染为 PNG 图片（文本版式简化渲染），可逐张下载',
  titleEn: 'PPT to Image',
  descriptionEn:
    'Render each .pptx slide as a PNG image with simplified text layout, download slide by slide',

  category: 'media',
  group: 'design',
  tags: ['ppt', 'pptx', 'png', 'image', 'slides'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['image'],
  options: ['size', 'background'],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}
