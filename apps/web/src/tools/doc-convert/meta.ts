import type { ToolMeta } from '@toolbox/catalog'

/**
 * doc-convert —— 全局编号 #540
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P2｜可行性：B｜模板：T3
 * 来源：docs/catalog 工具规划 #540（docs/tools/09-PDF-Office.md）
 *
 * 多格式文档互转：一次选择源文件，按源格式给出可达的目标格式，
 * 全部在浏览器本地完成。依赖仅 mammoth（docx 解析）与 xlsx（表格解析/生成）。
 */
export const meta: ToolMeta = {
  id: 'doc-convert',
  slug: 'doc-convert',
  title: '文档格式转换',
  description:
    'Word / Excel / CSV / JSON 多格式互转：docx 转 txt/html/md，表格转 json/csv/md/xlsx，全程本地',
  titleEn: 'Document Converter',
  descriptionEn: 'Convert between docx, xlsx, csv and json locally in the browser',

  category: 'media',
  group: 'design',
  tags: ['convert', 'docx', 'xlsx', 'csv', 'json'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text', 'file'],
  options: ['target'],

  deps: ['mammoth', 'xlsx'],
  worker: false,
  wasm: false,
  api: false,
}
