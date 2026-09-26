import type { ToolMeta } from '@toolbox/catalog'

/**
 * docker-config —— 全局编号 #219
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'docker-config',
  slug: 'docker-config',
  title: 'Docker 配置',
  description: '按选项生成 Dockerfile',
  titleEn: 'Dockerfile Generator',
  descriptionEn: 'Generate a Dockerfile from base image, workdir, port and start command options',

  category: 'devops',
  group: 'dev',
  tags: ['docker', 'dockerfile', 'container', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['baseImage', 'version', 'workdir', 'port', 'command'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
