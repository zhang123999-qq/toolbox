import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-form —— 全局编号 #492
 * 域：pdf（PDF / 办公）｜大组：office｜优先级：P2｜可行性：A｜模板：T2
 * PDF 表单填写：用 pdf-lib 的 getForm() 枚举表单字段，按类型渲染编辑器——
 * 文本框（setText，尊重 maxLength）、复选框（check/uncheck）、单选组、下拉框
 * （getOptions/select，多选亦支持）；导出新 PDF，可选拼合（flatten）。
 * 无表单字段的 PDF 显示明确空状态，不崩溃。
 * 注：不调用 updateFieldAppearances——pdf-lib 内置标准字体无法编码 CJK，
 * 调用会抛错；字段值在数据层面正确写入（多数阅读器可正常显示）。
 */
export const meta: ToolMeta = {
  id: 'pdf-form',
  slug: 'pdf-form',
  title: 'PDF 表单',
  description: '填写 PDF 表单：文本框、复选框、单选组、下拉框按类型编辑，可选拼合后导出',
  titleEn: 'PDF Form',
  descriptionEn:
    'Fill PDF forms: text fields, checkboxes, radio groups and dropdowns with per-type editors, optional flatten on export',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'form', 'fill', 'acroform'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['flatten'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
