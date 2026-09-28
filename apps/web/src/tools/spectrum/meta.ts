import type { ToolMeta } from '@toolbox/catalog'

/**
 * spectrum —— 全局编号 #553
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（Web Audio 解码 + 纯函数 FFT）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'spectrum',
  slug: 'spectrum',
  title: '频谱分析',
  description: '上传音频或使用麦克风，FFT 实时频谱图（canvas 绘制）',
  titleEn: 'Spectrum Analyzer',
  descriptionEn: 'FFT spectrum visualization from uploaded audio or microphone, drawn on canvas',

  category: 'media',
  group: 'design',
  tags: ['audio', 'spectrum', 'fft', 'frequency', 'microphone'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file', 'microphone'],
  outputs: ['image'],
  options: ['fftSize'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
