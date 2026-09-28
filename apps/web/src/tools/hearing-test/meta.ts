import type { ToolMeta } from '@toolbox/catalog'

/**
 * hearing-test —— 全局编号 #855
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C｜模板：T3
 *
 * 听力测试：WebAudio 播放不同频率正弦音，用户反馈是否听见，做听力筛查。
 */
export const meta: ToolMeta = {
  id: 'hearing-test',
  slug: 'hearing-test',
  title: '听力测试',
  description: '听力筛查小测试：播放不同频率的声音，记录能否听见，仅供参考非医学诊断',
  titleEn: 'Hearing Test',
  descriptionEn: 'Hearing screening: play tones at different frequencies, screening reference only',

  category: 'education',
  group: 'life',
  tags: ['hearing', 'audio', 'test', 'health', 'fun'],

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
