import type { ToolMeta } from '@toolbox/catalog'

/**
 * clipboard-test —— 全局编号 #864
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'clipboard-test',
  slug: 'clipboard-test',
  title: '剪贴板测试',
  description: '通过 Clipboard API 测试剪贴板读写能力，支持写入后读回一致性校验',
  titleEn: 'Clipboard Test',
  descriptionEn:
    'Tests clipboard read/write capability via the Clipboard API, with write-then-read roundtrip check',

  category: 'education',
  group: 'life',
  tags: ['clipboard', 'copy', 'paste', 'test'],

  priority: 'P1',
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
