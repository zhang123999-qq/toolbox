import type { ToolMeta } from '@toolbox/catalog'

/**
 * ci-config —— 全局编号 #257
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 生成 GitHub Actions CI 配置
 */
export const meta: ToolMeta = {
  id: 'ci-config',
  slug: 'ci-config',
  title: 'CI 配置',
  description: '配置触发分支、Node 版本与流水线步骤，生成 .github/workflows/ci.yml',
  titleEn: 'CI Config Generator',
  descriptionEn:
    'Configure trigger branch, Node version and pipeline steps, generate GitHub Actions ci.yml',

  category: 'devops',
  group: 'dev',
  tags: ['ci', 'github-actions', 'devops', 'pipeline', 'yaml'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['branch', 'nodeVersion', 'install', 'test', 'build', 'deploy'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
