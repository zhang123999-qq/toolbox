import type { ToolMeta } from '@toolbox/catalog'

/**
 * tag-gen —— 全局编号 #50
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'tag-gen',
  slug: 'tag-gen',
  title: '标签生成',
  description: '自动提取标签',
  titleEn: 'Tag Generator',
  descriptionEn: 'Extract tags automatically',

  category: 'text',
  group: 'dev',
  tags: ['text', 'tag', 'ai'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text', 'apiBase', 'apiKey', 'model'],
  outputs: ['text'],
  options: ['mode', 'limit'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
