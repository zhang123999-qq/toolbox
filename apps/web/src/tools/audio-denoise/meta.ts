import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-denoise —— 全局编号 #550
 * 域：media（音视频媒体）｜大组：design｜优先级：P1｜可行性：C（WebAudio 解码 + 纯 JS 谱减法/噪声门）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-denoise',
  slug: 'audio-denoise',
  title: '音频降噪',
  description: '上传音频，用谱减法或噪声门去除背景噪声，导出为 WAV 文件',
  titleEn: 'Audio Denoiser',
  descriptionEn:
    'Remove background noise from audio with spectral subtraction or noise gate, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'denoise', 'noise', 'spectral', 'wav'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['method', 'calibrationSeconds', 'oversubtraction', 'thresholdDb'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
