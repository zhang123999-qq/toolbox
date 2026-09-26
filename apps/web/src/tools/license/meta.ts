import type { ToolMeta } from '@toolbox/catalog'

/**
 * license —— 全局编号 #266
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'license',
  slug: 'license',
  title: 'License 生成',
  description: '选择开源许可证并填作者与年份，生成完整 LICENSE 文本',
  titleEn: 'License Generator',
  descriptionEn: 'Generate a full LICENSE text for common open-source licenses',

  category: 'devops',
  group: 'dev',
  tags: ['license', 'mit', 'apache', 'gpl', 'open-source'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['licenseType', 'author', 'year'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
