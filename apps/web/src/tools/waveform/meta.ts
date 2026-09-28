import type { ToolMeta } from '@toolbox/catalog'

/**
 * waveform —— 全局编号 #554
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（Web Audio 解码 + canvas 绘制）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'waveform',
  slug: 'waveform',
  title: '波形显示',
  description: '上传音频绘制波形，支持缩放查看细节',
  titleEn: 'Waveform Viewer',
  descriptionEn: 'Draw audio waveform from uploaded file with zoom support',

  category: 'media',
  group: 'design',
  tags: ['audio', 'waveform', 'visualization', 'zoom', 'media'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['image'],
  options: ['zoom'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
