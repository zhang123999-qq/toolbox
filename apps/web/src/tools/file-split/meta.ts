import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-split —— 全局编号 #521
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'file-split',
  slug: 'file-split',
  title: '文件切分',
  description: '按指定大小或数量把大文件切成多个分片，逐个下载',
  titleEn: 'Split File',
  descriptionEn:
    'Split a large file into multiple chunks by size or count, then download each part',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'split', 'chunk'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['file', 'text'],
  options: ['mode', 'value'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
