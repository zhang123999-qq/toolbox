import type { ToolMeta } from '@toolbox/catalog'

/**
 * gomoku —— 全局编号 #847
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 15×15 五子棋：玩家执黑先行，与简易 AI（白）对弈；胜负判定与 AI 均为纯函数。
 */
export const meta: ToolMeta = {
  id: 'gomoku',
  slug: 'gomoku',
  title: '五子棋',
  description: '15×15 五子棋人机对战：四方向五连判定，AI 会进攻成五与防守堵四',
  titleEn: 'Gomoku',
  descriptionEn: '15x15 Gomoku vs simple AI: five-in-a-row detection, AI attacks and blocks',

  category: 'education',
  group: 'life',
  tags: ['game', 'gomoku', 'board', 'ai', 'fun'],

  priority: 'P3',
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
