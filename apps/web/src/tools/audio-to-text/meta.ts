import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-to-text —— 全局编号 #555
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（Web Speech API 连续识别）｜模板：T3
 *
 * 与 #557 语音识别的区别：本工具是连续听写（dictation），把说的话逐句转成文字；
 * #557 是命令匹配——只判断说了哪个预设命令词。
 */
export const meta: ToolMeta = {
  id: 'audio-to-text',
  slug: 'audio-to-text',
  title: '音频转文字',
  description: '实时语音听写转文字（Web Speech API，连续识别、多语言选择）',
  titleEn: 'Audio to Text',
  descriptionEn: 'Continuous speech dictation to text via Web Speech API, multi-language',

  category: 'media',
  group: 'design',
  tags: ['audio', 'speech', 'dictation', 'transcription', 'stt'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['microphone'],
  outputs: ['text'],
  options: ['lang'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
