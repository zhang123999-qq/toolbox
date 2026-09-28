import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-mix —— 全局编号 #579
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（WebAudio 解码 + 纯函数混音）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-mix',
  slug: 'audio-mix',
  title: '音频混音',
  description: '多路音频按音量配比混音（对齐方式：最短 / 最长 / 循环），导出 WAV',
  titleEn: 'Audio Mixer',
  descriptionEn:
    'Mix multiple audio tracks by volume ratio with shortest/longest/loop alignment, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'mix', 'mixer', 'overlay', 'wav'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['align'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
