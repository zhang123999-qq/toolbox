import type { ToolMeta } from '@toolbox/catalog'

/**
 * yaml-to-k8s —— 全局编号 #251
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'yaml-to-k8s',
  slug: 'yaml-to-k8s',
  title: 'YAML 转 K8s',
  description: '校验并格式化 K8s YAML（apiVersion / kind / metadata）',
  titleEn: 'YAML to Kubernetes',
  descriptionEn: 'Validate and format a Kubernetes manifest YAML (apiVersion / kind / metadata)',

  category: 'devops',
  group: 'dev',
  tags: ['yaml', 'kubernetes', 'k8s', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
