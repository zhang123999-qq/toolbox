import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-cut —— 全局编号 #541
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（WebAudio 解码 + 纯函数 DSP）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-cut',
  slug: 'audio-cut',
  title: '音频裁剪',
  description: '上传音频，按起止时间裁剪出片段，导出为 WAV 文件',
  titleEn: 'Audio Cut',
  descriptionEn: 'Trim an audio file by start/end time and export the segment as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'cut', 'trim', 'wav', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['start', 'end'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
