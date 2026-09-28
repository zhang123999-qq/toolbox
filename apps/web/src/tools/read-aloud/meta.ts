import type { ToolMeta } from '@toolbox/catalog'

/**
 * read-aloud —— 全局编号 #740
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：C｜模板：T3
 * 语音朗读：浏览器内置 speechSynthesis 朗读文本，语速/音调/音量/语音可选 */
export const meta: ToolMeta = {
  id: 'read-aloud',
  slug: 'read-aloud',
  title: '语音朗读',
  description: '用浏览器内置语音朗读文本：语速、音调、音量、中文语音可选，长文本自动分句排队',
  titleEn: 'Read Aloud',
  descriptionEn: 'Read text aloud with built-in browser speech synthesis',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'tts', 'speech', 'accessibility'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
