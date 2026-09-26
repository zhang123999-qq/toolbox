import type { ToolMeta } from '@toolbox/catalog'

/**
 * k8s-config —— 全局编号 #221
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'k8s-config',
  slug: 'k8s-config',
  title: 'K8s 配置',
  description: '按资源类型生成常用 Kubernetes YAML',
  titleEn: 'K8s Manifest Generator',
  descriptionEn:
    'Generate common Kubernetes manifests (Deployment / Service / ConfigMap / Ingress / PVC)',

  category: 'devops',
  group: 'dev',
  tags: ['kubernetes', 'k8s', 'yaml', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['kind', 'name', 'image', 'port', 'replicas'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
