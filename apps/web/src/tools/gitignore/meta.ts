import type { ToolMeta } from '@toolbox/catalog'

/**
 * gitignore —— 全局编号 #218
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'gitignore',
  slug: 'gitignore',
  title: 'gitignore 生成',
  description: '按语言与环境组合生成 .gitignore',
  titleEn: 'Gitignore Generator',
  descriptionEn: 'Generate a combined .gitignore based on selected languages and environments',

  category: 'devops',
  group: 'dev',
  tags: ['git', 'gitignore', 'vcs', 'config'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'node',
    'python',
    'java',
    'go',
    'rust',
    'php',
    'ruby',
    'dotnet',
    'macos',
    'windows',
    'linux',
    'docker',
    'ide',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
