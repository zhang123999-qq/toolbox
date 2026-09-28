import type { ToolMeta } from '@toolbox/catalog'

/**
 * metronome —— 全局编号 #551
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：C（Web Audio 合成节拍声）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'metronome',
  slug: 'metronome',
  title: '节拍器',
  description: '可调 BPM 与拍号的节拍器，WebAudio 合成节拍声并可视闪烁',
  titleEn: 'Metronome',
  descriptionEn:
    'Adjustable BPM and time-signature metronome with WebAudio clicks and visual flash',

  category: 'media',
  group: 'design',
  tags: ['audio', 'metronome', 'bpm', 'rhythm', 'music'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['options'],
  outputs: ['audio'],
  options: ['bpm', 'beatsPerBar', 'beatUnit'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
