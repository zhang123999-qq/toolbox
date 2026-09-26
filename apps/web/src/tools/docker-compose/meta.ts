import type { ToolMeta } from '@toolbox/catalog'

/**
 * docker-compose —— 全局编号 #220
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'docker-compose',
  slug: 'docker-compose',
  title: 'Docker Compose',
  description: '按选项生成 docker-compose.yml',
  titleEn: 'Docker Compose Generator',
  descriptionEn: 'Generate a docker-compose.yml for a single service',

  category: 'devops',
  group: 'dev',
  tags: ['docker', 'compose', 'container', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['serviceName', 'image', 'ports', 'environment', 'volumes', 'dependsOn'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
