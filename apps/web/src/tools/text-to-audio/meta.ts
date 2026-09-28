import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-to-audio —— 全局编号 #556
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（SpeechSynthesis 朗读）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'text-to-audio',
  slug: 'text-to-audio',
  title: '文字转语音',
  description: '文字转语音朗读（SpeechSynthesis），音色/语速/音调可调',
  titleEn: 'Text to Speech',
  descriptionEn: 'Text-to-speech readout with adjustable voice, rate and pitch',

  category: 'media',
  group: 'design',
  tags: ['audio', 'tts', 'speech', 'voice', 'readout'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['audio'],
  options: ['voice', 'rate', 'pitch'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
