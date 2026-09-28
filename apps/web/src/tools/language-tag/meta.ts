import type { ToolMeta } from '@toolbox/catalog'

/**
 * language-tag —— 全局编号 #721
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * BCP 47 语言标签：解析、构建、校验与中文含义说明 */
export const meta: ToolMeta = {
  id: 'language-tag',
  slug: 'language-tag',
  title: '语言标签',
  description: 'BCP 47 语言标签解析、构建与校验：拆解语言/文字/地区/变体/扩展/私用，并给出中文含义',
  titleEn: 'Language Tag',
  descriptionEn:
    'Parse, build and validate BCP 47 language tags: language/script/region/variant/extension/private-use with Chinese glosses',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'bcp47', 'locale', 'language'],

  priority: 'P1',
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
