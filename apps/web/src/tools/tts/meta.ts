import type { ToolMeta } from '@toolbox/catalog'

/**
 * tts —— 全局编号 #68
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'tts',
  slug: 'tts',
  title: '文本转语音',
  description: '浏览器语音合成',
  titleEn: 'Text to Speech',
  descriptionEn: 'Speech synthesis in the browser',

  category: 'text',
  group: 'dev',
  tags: ['text', 'tts', 'speech'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['rate'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
