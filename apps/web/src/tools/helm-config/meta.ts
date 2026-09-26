import type { ToolMeta } from '@toolbox/catalog'

/**
 * helm-config —— 全局编号 #222
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'helm-config',
  slug: 'helm-config',
  title: 'Helm 配置',
  description: '生成 Helm Chart 骨架（Chart.yaml + values.yaml + 目录结构）',
  titleEn: 'Helm Chart Generator',
  descriptionEn: 'Scaffold a Helm Chart: directory tree, Chart.yaml and values.yaml',

  category: 'devops',
  group: 'dev',
  tags: ['helm', 'kubernetes', 'chart', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['chartName', 'version', 'description'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
