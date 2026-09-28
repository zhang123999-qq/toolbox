import type { ToolMeta } from '@toolbox/catalog'

/**
 * translation-convert —— 全局编号 #726
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * i18n 翻译文件格式互转：JSON / PO / YAML / CSV */
export const meta: ToolMeta = {
  id: 'translation-convert',
  slug: 'translation-convert',
  title: '翻译文件转换',
  description: 'i18n 翻译文件格式互转：JSON、PO、YAML、CSV 四种格式任意互转，嵌套键自动拍平为点路径',
  titleEn: 'Translation File Converter',
  descriptionEn: 'Convert i18n translation files between JSON, PO, YAML and CSV; nested keys flatten to dot paths',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'json', 'po', 'yaml', 'csv'],

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
