import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-trim —— 全局编号 #577
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（WebAudio 解码 + 纯函数静音检测）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-trim',
  slug: 'audio-trim',
  title: '音频去静音',
  description: '自动检测并裁掉音频首尾的静音段（阈值 dB 与最小时长可调），导出 WAV',
  titleEn: 'Audio Silence Trimmer',
  descriptionEn:
    'Automatically detect and trim leading/trailing silence with adjustable dB threshold and minimum duration, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'silence', 'trim', 'denoise', 'wav'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['thresholdDb', 'minSilenceSec'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
