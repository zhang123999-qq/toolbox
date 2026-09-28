import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-spectrogram —— 全局编号 #575
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（WebAudio 解码 + 纯 JS STFT + Canvas 绘制）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-spectrogram',
  slug: 'audio-spectrogram',
  title: '音频频谱图',
  description: '上传音频，用短时傅里叶变换（STFT）生成语谱图，窗长与重叠率可调，导出 PNG',
  titleEn: 'Audio Spectrogram',
  descriptionEn:
    'Upload audio and render a spectrogram via short-time Fourier transform (STFT) in pure JS, exportable as PNG',

  category: 'media',
  group: 'design',
  tags: ['audio', 'spectrogram', 'stft', 'fft', 'visualization'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['image'],
  options: ['windowSize', 'overlapPct'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
