import type { ToolMeta } from '@toolbox/catalog'

/**
 * git-diff —— 全局编号 #216
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'git-diff',
  slug: 'git-diff',
  title: 'Git Diff',
  description: '解析 git diff 输出，汇总文件数与增删行数',
  titleEn: 'Git Diff Summary',
  descriptionEn: 'Parse git diff output and summarize changed files and line counts',

  category: 'devops',
  group: 'dev',
  tags: ['git', 'diff', 'summary', 'cli'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['verbose'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
