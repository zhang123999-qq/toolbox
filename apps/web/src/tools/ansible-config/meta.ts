import type { ToolMeta } from '@toolbox/catalog'

/**
 * ansible-config —— 全局编号 #224
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'ansible-config',
  slug: 'ansible-config',
  title: 'Ansible 配置',
  description: '按任务选项生成 Ansible Playbook YAML',
  titleEn: 'Ansible Playbook Generator',
  descriptionEn: 'Generate an Ansible playbook YAML from selected tasks',

  category: 'devops',
  group: 'dev',
  tags: ['ansible', 'playbook', 'automation', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'hosts',
    'taskName',
    'become',
    'installPackage',
    'copyFile',
    'startService',
    'manageUser',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
