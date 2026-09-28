import type { ToolMeta } from '@toolbox/catalog'

/**
 * speech-recognition —— 全局编号 #557
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（Web Speech 语音识别）｜模板：T3
 *
 * 注意：本工具是「命令词匹配」（预设命令词，识别后匹配高亮），
 * 不是连续听写——听写请用 #555 音频转文字。
 */
export const meta: ToolMeta = {
  id: 'speech-recognition',
  slug: 'speech-recognition',
  title: '语音识别',
  description: '语音命令词识别匹配：预设命令词，说出后高亮触发',
  titleEn: 'Speech Recognition',
  descriptionEn: 'Voice command matching: preset command words, highlighted on match',

  category: 'media',
  group: 'design',
  tags: ['audio', 'speech', 'voice', 'command', 'recognition'],

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
