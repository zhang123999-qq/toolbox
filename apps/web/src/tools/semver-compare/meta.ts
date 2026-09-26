import type { ToolMeta } from '@toolbox/catalog'

/**
 * semver-compare —— 全局编号 #263
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 说明：不依赖 semver 包，按 SemVer 2.0.0 规范自研解析与比较。
 */
export const meta: ToolMeta = {
  id: 'semver-compare',
  slug: 'semver-compare',
  title: '版本号比较',
  description: '比较两个 SemVer 版本号（含预发布号与 build metadata），拆解各字段',
  titleEn: 'SemVer Compare',
  descriptionEn: 'Compare two SemVer versions with prerelease and build metadata',

  category: 'devops',
  group: 'dev',
  tags: ['semver', 'version', 'compare'],

  priority: 'P1',
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
