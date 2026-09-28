import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-fade —— 全局编号 #578
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（WebAudio 解码 + 纯函数淡入淡出）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-fade',
  slug: 'audio-fade',
  title: '音频淡入淡出',
  description: '对音频首尾应用淡入 / 淡出曲线（线性 / 指数可选），导出 WAV',
  titleEn: 'Audio Fade',
  descriptionEn:
    'Apply fade-in / fade-out curves (linear or exponential) to PCM audio and export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'fade', 'fade-in', 'fade-out', 'wav'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['fadeIn', 'fadeOut', 'curve'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
