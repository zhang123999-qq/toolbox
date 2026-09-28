import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-visualizer —— 全局编号 #584
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（WebAudio + Canvas 实时渲染）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-visualizer',
  slug: 'audio-visualizer',
  title: '音频可视化',
  description: '上传音频，柱状频谱 / 波形 / 圆形频谱三种样式在画布上实时渲染，可暂停',
  titleEn: 'Audio Visualizer',
  descriptionEn:
    'Render uploaded audio in real time on canvas: bars, waveform or circular spectrum',

  category: 'media',
  group: 'design',
  tags: ['audio', 'visualizer', 'spectrum', 'waveform', 'canvas'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['canvas'],
  options: ['style'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
