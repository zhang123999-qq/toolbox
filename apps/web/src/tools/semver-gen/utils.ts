import type { SemverGenInput, SemverGenOptions } from './schema'

interface Parsed {
  major: number
  minor: number
  patch: number
  pre: string[]
}

const NUM = /^(0|[1-9]\d*)$/

export function parse(raw: string): Parsed {
  const input = raw.trim().replace(/^[vV]/, '').split('+')[0]
  // 只按第一个连字符切分 core 与 prerelease：预发布标识符本身允许含连字符
  //（如 1.4.2-rc-1），不能用 split('-') 后解构取前两段，否则末尾段会被丢弃。
  const dashIdx = input.indexOf('-')
  const core = dashIdx === -1 ? input : input.slice(0, dashIdx)
  const preRaw = dashIdx === -1 ? '' : input.slice(dashIdx + 1)
  const parts = core.split('.')
  if (parts.length !== 3 || parts.some((p) => !NUM.test(p))) {
    throw new Error(`版本号非法：「${raw.trim()}」应为 major.minor[.patch]，例如 1.2.3`)
  }
  return {
    major: Number(parts[0]),
    minor: Number(parts[1]),
    patch: Number(parts[2]),
    pre: preRaw ? preRaw.split('.') : [],
  }
}

/** 判断某段 pre 是否为数字段 */
function isNum(seg: string): boolean {
  return NUM.test(seg)
}

/**
 * 按 bump 类型计算下一个版本。
 * prerelease：若当前已是预发布号则 patch 段 +1，否则进入 <preId>.0。
 */
export function bumpVersion(raw: string, bump: string, preId: string): string {
  const v = parse(raw)
  const id = preId.trim() || 'beta'

  switch (bump) {
    case 'major':
      return `${v.major + 1}.0.0`
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`
    case 'premajor':
      return `${v.major + 1}.0.0-${id}.0`
    case 'preminor':
      return `${v.major}.${v.minor + 1}.0-${id}.0`
    case 'prepatch':
      return `${v.major}.${v.minor}.${v.patch + 1}-${id}.0`
    case 'prerelease': {
      if (v.pre.length === 0) {
        return `${v.major}.${v.minor}.${v.patch + 1}-${id}.0`
      }
      // 已有预发布号：把最后一段数字 +1，否则追加 .0
      const last = v.pre[v.pre.length - 1]
      if (isNum(last)) {
        v.pre[v.pre.length - 1] = String(Number(last) + 1)
        return `${v.major}.${v.minor}.${v.patch}-${v.pre.join('.')}`
      }
      return `${v.major}.${v.minor}.${v.patch}-${v.pre.join('.')}.0`
    }
    default:
      throw new Error('不支持的 bump 类型：' + bump)
  }
}

const BUMP_NOTE: Record<string, string> = {
  major: '不兼容的 API 变更：递增 major，minor/patch 归零',
  minor: '向后兼容的新功能：递增 minor，patch 归零',
  patch: '向后兼容的修复：递增 patch',
  premajor: '下一个大版本的预发布：major+1.0.0-<preId>.0',
  preminor: '下一个小版本的预发布：major.minor+1.0-<preId>.0',
  prepatch: '下一个补丁的预发布：major.minor.patch+1-<preId>.0',
  prerelease: '预发布迭代：同 core 下预发布号 +1',
}

export function transform(input: SemverGenInput, options: SemverGenOptions): string {
  if (input.text.trim() === '') return ''
  const next = bumpVersion(input.text, options.bump, options.preId)
  return [
    `当前版本：${input.text.trim()}`,
    `bump 类型：${options.bump} —— ${BUMP_NOTE[options.bump]}`,
    `下一版本：${next}`,
    '',
    '# CHANGELOG 建议条目',
    `## [${next}] - ${new Date().toISOString().slice(0, 10)}`,
    '- （按实际变更填写：新增 / 修复 / 破坏性变更）',
  ].join('\n')
}
