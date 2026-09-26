import type { ToolMeta } from '@toolbox/catalog'

/**
 * readme —— 全局编号 #267
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'readme',
  slug: 'readme',
  title: 'README 生成',
  description: '填项目名、描述、功能列表与许可证，生成结构化 README.md',
  titleEn: 'README Generator',
  descriptionEn: 'Generate a structured README.md with install / usage / license sections',

  category: 'devops',
  group: 'dev',
  tags: ['readme', 'documentation', 'markdown'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['projectName', 'description', 'license'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
