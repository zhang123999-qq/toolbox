import type { DependencyInput, DependencyOptions } from './schema'

const MAX_INPUT = 200_000

interface PkgLike {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export type RangeKind = 'exact' | 'caret' | 'tilde' | 'wildcard' | 'range' | 'other'

/** 判定单个版本范围的宽松程度 */
export function classifyRange(version: string): RangeKind {
  const v = version.trim()
  if (v === '' || v === '*' || v === 'latest' || v === 'x' || v === 'X') return 'wildcard'
  if (/^[\^~]/.test(v)) return v.startsWith('^') ? 'caret' : 'tilde'
  // 纯 x.y.z 数字段
  if (/^\d+(\.\d+){0,2}$/.test(v)) return 'exact'
  return 'range'
}

export const RANGE_LABEL: Record<RangeKind, string> = {
  exact: '精确版本',
  caret: '^ 兼容更新',
  tilde: '~ 补丁更新',
  wildcard: '* / latest 通配',
  range: '区间 / 其它',
  other: '其它',
}

/** 解析 package.json 文本；非法 JSON 抛中文错误 */
export function parsePkg(text: string): PkgLike {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('无法解析 package.json：请输入合法的 JSON')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('package.json 顶层必须是对象')
  }
  return parsed as PkgLike
}

export interface DepReport {
  total: number
  depCount: number
  devCount: number
  peerCount: number
  duplicates: string[]
  rangeCounts: Record<RangeKind, number>
  risky: string[]
}

export function analyze(pkg: PkgLike): DepReport {
  const dep = pkg.dependencies ?? {}
  const dev = pkg.devDependencies ?? {}
  const peer = pkg.peerDependencies ?? {}

  const allNames = new Set<string>([...Object.keys(dep), ...Object.keys(dev), ...Object.keys(peer)])

  // 同时出现在 dependencies 与 devDependencies 视为重复
  const duplicates = Object.keys(dep)
    .filter((n) => n in dev)
    .sort()

  const rangeCounts: Record<RangeKind, number> = {
    exact: 0,
    caret: 0,
    tilde: 0,
    wildcard: 0,
    range: 0,
    other: 0,
  }
  const risky: string[] = []

  for (const [name, version] of Object.entries(dep)) {
    const kind = classifyRange(version)
    rangeCounts[kind] += 1
    if (kind === 'wildcard') risky.push(`${name}@${version}`)
  }

  return {
    total: allNames.size,
    depCount: Object.keys(dep).length,
    devCount: Object.keys(dev).length,
    peerCount: Object.keys(peer).length,
    duplicates,
    rangeCounts,
    risky,
  }
}

export function render(report: DepReport): string {
  const lines: string[] = []
  lines.push('依赖概览：')
  lines.push(`  依赖总数（去重）：${report.total}`)
  lines.push(`  dependencies：${report.depCount}`)
  lines.push(`  devDependencies：${report.devCount}`)
  lines.push(`  peerDependencies：${report.peerCount}`)
  lines.push('')
  lines.push('生产依赖版本范围分布：')
  for (const kind of ['exact', 'caret', 'tilde', 'wildcard', 'range'] as const) {
    lines.push(`  ${RANGE_LABEL[kind]}：${report.rangeCounts[kind]}`)
  }
  lines.push('')
  if (report.duplicates.length > 0) {
    lines.push(`同时出现在 dependencies 与 devDependencies（建议去重）：`)
    for (const n of report.duplicates) lines.push(`  - ${n}`)
  } else {
    lines.push('重复依赖：无')
  }
  lines.push('')
  if (report.risky.length > 0) {
    lines.push('过时风险（生产依赖使用 * / latest，不可复现构建）：')
    for (const n of report.risky) lines.push(`  - ${n}`)
  } else {
    lines.push('过时风险：生产依赖未发现 * / latest 通配')
  }
  return lines.join('\n')
}

export function transform(input: DependencyInput, _options: DependencyOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return render(analyze(parsePkg(input.text)))
}
