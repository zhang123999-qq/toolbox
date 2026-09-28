import type { ToolMeta } from '@toolbox/catalog'

/**
 * audio-record —— 全局编号 #549
 * 域：media（音视频媒体）｜大组：design｜优先级：P1｜可行性：C（MediaRecorder 本地录音）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'audio-record',
  slug: 'audio-record',
  title: '在线录音机',
  description: '用麦克风在浏览器本地录音，支持暂停 / 继续，导出为音频文件',
  titleEn: 'Online Voice Recorder',
  descriptionEn:
    'Record audio locally in the browser with pause/resume support, export the recording',

  category: 'media',
  group: 'design',
  tags: ['audio', 'record', 'microphone', 'recorder', 'media'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: [],
  outputs: ['audio'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
