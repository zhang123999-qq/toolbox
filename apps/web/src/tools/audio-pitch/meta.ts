import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-pitch —— 全局编号 #546
 * 域：media（音视频媒体）｜大组：design｜优先级：P1｜可行性：C（WebAudio 解码 + 重采样变调）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-pitch',
  slug: 'audio-pitch',
  title: '音频变调',
  description: '上传音频，按半音数升调或降调（重采样实现），导出为 WAV 文件',
  titleEn: 'Audio Pitch Shifter',
  descriptionEn: 'Shift audio pitch up or down by semitones via resampling, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'pitch', 'semitone', 'resample', 'wav'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['semitones'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
