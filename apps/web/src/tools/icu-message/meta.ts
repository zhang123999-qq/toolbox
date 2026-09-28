import type { ToolMeta } from '@toolbox/catalog'

/**
 * icu-message —— 全局编号 #728
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * ICU MessageFormat 预览：解析 plural / select / 占位符，代入变量看渲染结果 */
export const meta: ToolMeta = {
  id: 'icu-message',
  slug: 'icu-message',
  title: 'ICU 消息预览',
  description:
    'ICU MessageFormat 消息预览：解析 plural / select / 数字 / 日期占位符，代入变量实时渲染，列出全部占位变量',
  titleEn: 'ICU Message Preview',
  descriptionEn:
    'Preview ICU MessageFormat messages: parse plural/select/number/date placeholders, render with values',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'icu', 'messageformat'],

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
