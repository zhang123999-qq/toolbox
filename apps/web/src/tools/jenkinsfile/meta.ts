import type { ToolMeta } from '@toolbox/catalog'

/**
 * jenkinsfile —— 全局编号 #259
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 生成声明式 Jenkinsfile
 */
export const meta: ToolMeta = {
  id: 'jenkinsfile',
  slug: 'jenkinsfile',
  title: 'Jenkinsfile',
  description: '配置 agent / stages / post，生成声明式 Jenkinsfile',
  titleEn: 'Jenkinsfile Generator',
  descriptionEn: 'Configure agent / stages / post and generate a declarative Jenkinsfile',

  category: 'devops',
  group: 'dev',
  tags: ['jenkins', 'ci', 'devops', 'pipeline', 'groovy'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['agent', 'stages', 'post'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
