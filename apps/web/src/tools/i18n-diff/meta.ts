import type { ToolMeta } from '@toolbox/catalog'

/**
 * i18n-diff —— 全局编号 #727
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 双语 i18n JSON 对比：缺失 / 多余 / 空值 / 未翻译，一眼看出翻译缺口 */
export const meta: ToolMeta = {
  id: 'i18n-diff',
  slug: 'i18n-diff',
  title: 'i18n JSON 对比',
  description:
    '对比基准语言与目标语言的 i18n JSON：检出缺失、多余、空值与未翻译的键，给出翻译完成率',
  titleEn: 'i18n JSON Diff',
  descriptionEn:
    'Diff base vs target i18n JSON: missing, extra, empty and untranslated keys with completion rate',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'json', 'diff', 'locale'],

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
