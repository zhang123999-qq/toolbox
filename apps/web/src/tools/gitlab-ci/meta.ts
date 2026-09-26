import type { ToolMeta } from '@toolbox/catalog'

/**
 * gitlab-ci —— 全局编号 #258
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 生成 .gitlab-ci.yml
 */
export const meta: ToolMeta = {
  id: 'gitlab-ci',
  slug: 'gitlab-ci',
  title: 'GitLab CI',
  description: '配置镜像、stages 与脚本步骤，生成 .gitlab-ci.yml',
  titleEn: 'GitLab CI Config',
  descriptionEn: 'Configure image, stages and script steps, generate .gitlab-ci.yml',

  category: 'devops',
  group: 'dev',
  tags: ['gitlab', 'ci', 'devops', 'pipeline', 'yaml'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['image', 'stages', 'script'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
