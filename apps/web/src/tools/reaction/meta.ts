import type { ToolMeta } from '@toolbox/catalog'

/**
 * reaction —— 全局编号 #851
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 反应时间测量：随机等待后变色点击，抢跑判犯规，状态机为纯函数、时间可注入。
 */
export const meta: ToolMeta = {
  id: 'reaction',
  slug: 'reaction',
  title: '反应测试',
  description: '反应速度测试：随机等待后尽快点击，抢跑判犯规，给出评级',
  titleEn: 'Reaction Test',
  descriptionEn: 'Reaction time test: click as soon as it turns green, false starts foul',

  category: 'education',
  group: 'life',
  tags: ['game', 'reaction', 'test', 'fun'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
