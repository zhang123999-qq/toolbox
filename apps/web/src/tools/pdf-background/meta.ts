import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-background —— 全局编号 #531
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pdf-background',
  slug: 'pdf-background',
  title: 'PDF 加背景色',
  description: '给 PDF 每一页垫一层浅色背景（画在原有内容之下），纯本地处理',
  titleEn: 'Add Background Color to PDF',
  descriptionEn: 'Add a light background color behind every PDF page content, processed locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'edit', 'background', 'color'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['file'],
  options: ['color'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
