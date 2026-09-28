import type { ToolMeta } from '@toolbox/catalog'

/**
 * tuner —— 全局编号 #552
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（麦克风 + Web Audio 采集）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'tuner',
  slug: 'tuner',
  title: '调音器',
  description: '麦克风实时音高检测（自相关算法），显示音名与偏差音分',
  titleEn: 'Tuner',
  descriptionEn:
    'Real-time microphone pitch detection via autocorrelation, showing note name and cent deviation',

  category: 'media',
  group: 'design',
  tags: ['audio', 'tuner', 'pitch', 'music', 'microphone'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['microphone'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
