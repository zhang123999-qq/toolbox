import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-format —— 全局编号 #580
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（纯函数魔数识别）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-format',
  slug: 'audio-format',
  title: '音频格式识别',
  description: '读取文件头魔数识别音频格式（WAV/MP3/FLAC/Ogg/M4A/AAC/WMA/AIFF）',
  titleEn: 'Audio Format Detector',
  descriptionEn:
    'Detect audio format from file header magic bytes (WAV/MP3/FLAC/Ogg/M4A/AAC/WMA/AIFF)',

  category: 'media',
  group: 'design',
  tags: ['audio', 'format', 'magic', 'detect', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
