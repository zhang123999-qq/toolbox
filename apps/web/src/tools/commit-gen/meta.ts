import type { ToolMeta } from '@toolbox/catalog'

/**
 * commit-gen —— 全局编号 #217
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'commit-gen',
  slug: 'commit-gen',
  title: '提交信息生成',
  description: '按 Conventional Commits 规范本地生成 commit message',
  titleEn: 'Commit Message Generator',
  descriptionEn: 'Generate a Conventional Commits message locally, no LLM required',

  category: 'devops',
  group: 'dev',
  tags: ['git', 'commit', 'conventional-commits', 'cli'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'scope', 'description', 'body', 'breaking', 'footer'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
