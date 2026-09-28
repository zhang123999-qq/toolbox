import type { ToolMeta } from '@toolbox/catalog'

/**
 * chat-history —— 全局编号 #595
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯本地 localStorage 管理）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'chat-history',
  slug: 'chat-history',
  title: '对话历史',
  description: '本地对话记录管理：添加、导入、搜索、筛选、导出，全程不联网',
  titleEn: 'Chat History',
  descriptionEn: 'Manage local chat records: add, import, search, filter, export — fully offline',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'chat', 'history', 'local'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['modelFilter', 'sortOrder'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
