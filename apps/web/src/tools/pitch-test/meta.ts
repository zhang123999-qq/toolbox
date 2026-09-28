import type { ToolMeta } from '@toolbox/catalog'

/**
 * pitch-test —— 全局编号 #856
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C｜模板：T3
 *
 * 音准测试：WebAudio 播放两个音高，用户判断第二个音更高/更低/相同。
 */
export const meta: ToolMeta = {
  id: 'pitch-test',
  slug: 'pitch-test',
  title: '音准测试',
  description: '音高辨别小测试：听两个音，判断第二个音更高、更低还是相同',
  titleEn: 'Pitch Test',
  descriptionEn: 'Pitch discrimination: hear two tones, tell if the second is higher, lower or the same',

  category: 'education',
  group: 'life',
  tags: ['pitch', 'audio', 'music', 'test', 'fun'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
