import type { ToolMeta } from '@toolbox/catalog'

/**
 * stt —— 全局编号 #69
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'stt',
  slug: 'stt',
  title: '语音转文本',
  description: '浏览器语音识别',
  titleEn: 'Speech to Text',
  descriptionEn: 'Speech recognition in the browser',

  category: 'text',
  group: 'dev',
  tags: ['text', 'stt', 'speech'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
