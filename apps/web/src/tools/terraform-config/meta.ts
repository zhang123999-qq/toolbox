import type { ToolMeta } from '@toolbox/catalog'

/**
 * terraform-config —— 全局编号 #223
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'terraform-config',
  slug: 'terraform-config',
  title: 'Terraform 配置',
  description: '按 provider 与资源类型生成 main.tf / variables.tf / outputs.tf',
  titleEn: 'Terraform Config Generator',
  descriptionEn: 'Generate main.tf, variables.tf and outputs.tf for AWS / Azure / GCP',

  category: 'devops',
  group: 'dev',
  tags: ['terraform', 'iac', 'cloud', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['provider', 'resource'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
