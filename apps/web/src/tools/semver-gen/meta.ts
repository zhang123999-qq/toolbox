import type { ToolMeta } from '@toolbox/catalog'

/**
 * semver-gen —— 全局编号 #264
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'semver-gen',
  slug: 'semver-gen',
  title: '版本号生成',
  description: '基于当前版本号，按 major/minor/patch/预发布 类型 bump 出下一个版本',
  titleEn: 'SemVer Bump',
  descriptionEn: 'Bump a SemVer version to the next major/minor/patch/prerelease',

  category: 'devops',
  group: 'dev',
  tags: ['semver', 'version', 'release', 'changelog'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['bump', 'preId'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
