import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-speed —— 全局编号 #545
 * 域：media（音视频媒体）｜大组：design｜优先级：P1｜可行性：C（WebAudio 解码 + 线性插值重采样）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-speed',
  slug: 'audio-speed',
  title: '音频变速',
  description: '上传音频，按倍率加速或减速（线性插值重采样），导出为 WAV 文件',
  titleEn: 'Audio Speed Changer',
  descriptionEn:
    'Speed up or slow down audio by a factor via linear-interpolation resampling, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'speed', 'tempo', 'resample', 'wav'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['rate'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
