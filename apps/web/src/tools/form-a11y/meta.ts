import type { ToolMeta } from '@toolbox/catalog'

/**
 * form-a11y —— 全局编号 #730
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 表单无障碍检查：标签关联 / 必填标识 / 错误提示 / 分组 / 提交按钮 */
export const meta: ToolMeta = {
  id: 'form-a11y',
  slug: 'form-a11y',
  title: '表单无障碍',
  description: '表单 HTML 无障碍检查：控件标签关联、placeholder 冒充、必填标识、错误提示关联、fieldset 分组、提交按钮与重复 id',
  titleEn: 'Form Accessibility',
  descriptionEn: 'Form accessibility audit: label association, required markers, error linkage, fieldset grouping, submit button',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'form', 'html'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
