import type { ToolMeta } from '@toolbox/catalog'

/**
 * makefile —— 全局编号 #260
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'makefile',
  slug: 'makefile',
  title: 'Makefile 生成',
  description: '配置目标名、依赖与命令，生成带 .PHONY 与变量的 Makefile',
  titleEn: 'Makefile Generator',
  descriptionEn: 'Generate a Makefile with phony targets, variables and recipes',

  category: 'devops',
  group: 'dev',
  tags: ['makefile', 'build', 'automation', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['targetName', 'deps', 'command'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
