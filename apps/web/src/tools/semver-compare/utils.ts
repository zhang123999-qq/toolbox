import type { SemverCompareInput, SemverCompareOptions } from './schema'

/** 解析后的 SemVer 结构体 */
export interface SemVer {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: readonly (string | number)[]
  readonly build: string
}

const NUMERIC_IDENT = /^(0|[1-9]\d*)$/

/**
 * 解析一个版本字符串。容忍可选的前导 v / V。
 * 非法时抛中文错误。
 */
export function parseVersion(raw: string): SemVer {
  const input = raw.trim().replace(/^[vV]/, '')
  const buildMatch = input.split('+')
  const coreAndPre = buildMatch[0] ?? ''
  const build = buildMatch.slice(1).join('+')

  const preSplit = coreAndPre.split('-')
  const core = preSplit[0]
  const preRaw = preSplit.slice(1).join('-')

  const parts = core.split('.')
  if (parts.length !== 3 || parts.some((p) => !NUMERIC_IDENT.test(p))) {
    throw new Error(`版本号非法：「${raw.trim()}」应为 major.minor[.patch]，例如 1.2.3`)
  }
  const [major, minor, patch] = parts.map(Number)

  const prerelease: (string | number)[] = []
  if (preRaw !== '') {
    for (const ident of preRaw.split('.')) {
      if (ident === '') throw new Error(`预发布段为空：「${raw.trim()}」`)
      if (NUMERIC_IDENT.test(ident)) prerelease.push(Number(ident))
      else prerelease.push(ident)
    }
  }
  return { major, minor, patch, prerelease, build }
}

/** 比较两个 prerelease 标识符：数字按数值，其余按 ASCII；数字 < 字符串 */
function compareIdent(a: string | number, b: string | number): number {
  const aIsNum = typeof a === 'number'
  const bIsNum = typeof b === 'number'
  if (aIsNum && bIsNum) return (a as number) - (b as number)
  if (aIsNum) return -1
  if (bIsNum) return 1
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}

/**
 * 比较两个 SemVer：返回 -1 / 0 / 1。
 * 有预发布号的版本 < 无预发布号的同 core 版本。
 */
export function compare(a: SemVer, b: SemVer): number {
  const core = [a.major - b.major, a.minor - b.minor, a.patch - b.patch].find((d) => d !== 0)
  if (core !== undefined) return Math.sign(core)

  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1

  const len = Math.min(a.prerelease.length, b.prerelease.length)
  for (let i = 0; i < len; i += 1) {
    const c = compareIdent(a.prerelease[i], b.prerelease[i])
    if (c !== 0) return c
  }
  return Math.sign(a.prerelease.length - b.prerelease.length)
}

export function describe(v: SemVer): string {
  const core = `${v.major}.${v.minor}.${v.patch}`
  const pre = v.prerelease.length > 0 ? `-${v.prerelease.join('.')}` : ''
  const bld = v.build ? `+${v.build}` : ''
  return `${core}${pre}${bld}`
}

export function transform(input: SemverCompareInput, _options: SemverCompareOptions): string {
  if (input.text.trim() === '') return ''
  const lines = input.text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    throw new Error('请在输入框中分两行填写两个版本号，例如第一行 1.2.3，第二行 1.2.4-beta.1')
  }
  const a = parseVersion(lines[0])
  const b = parseVersion(lines[1])
  const cmp = compare(a, b)
  const relation = cmp > 0 ? '大于' : cmp < 0 ? '小于' : '等于'
  const op = cmp > 0 ? '>' : cmp < 0 ? '<' : '=='

  return [
    `${describe(a)} ${op} ${describe(b)}`,
    `结论：${describe(a)} ${relation} ${describe(b)}`,
    '',
    `版本 A：${describe(a)}`,
    `  major=${a.major} minor=${a.minor} patch=${a.patch}`,
    `  prerelease=[${a.prerelease.join(', ')}] build=${a.build || '(无)'}`,
    `版本 B：${describe(b)}`,
    `  major=${b.major} minor=${b.minor} patch=${b.patch}`,
    `  prerelease=[${b.prerelease.join(', ')}] build=${b.build || '(无)'}`,
  ].join('\n')
}
