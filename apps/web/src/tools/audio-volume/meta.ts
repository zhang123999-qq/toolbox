import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-volume —— 全局编号 #544
 * 域：media（音视频媒体）｜大组：design｜优先级：P1｜可行性：C（WebAudio 解码 + 纯函数 DSP）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-volume',
  slug: 'audio-volume',
  title: '音量调节',
  description: '上传音频，按分贝增减音量或做峰值归一化，导出为 WAV 文件',
  titleEn: 'Audio Volume Adjuster',
  descriptionEn: 'Adjust audio volume by decibels or apply peak normalization, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'volume', 'gain', 'normalize', 'wav'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['mode', 'gainDb', 'targetPeak'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
