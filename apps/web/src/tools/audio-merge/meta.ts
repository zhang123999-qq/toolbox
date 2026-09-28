import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-merge —— 全局编号 #547
 * 域：media（音视频媒体）｜大组：design｜优先级：P1｜可行性：C（WebAudio 解码 + 纯函数拼接/混音）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-merge',
  slug: 'audio-merge',
  title: '音频合并',
  description: '上传多个音频，首尾拼接或混音叠加，导出为 WAV 文件',
  titleEn: 'Audio Merger',
  descriptionEn: 'Merge multiple audio files by concatenation or mixing, export as WAV',

  category: 'media',
  group: 'design',
  tags: ['audio', 'merge', 'concat', 'mix', 'wav'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['audio'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
