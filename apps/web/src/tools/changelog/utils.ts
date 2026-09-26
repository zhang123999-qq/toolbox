import type { ChangelogInput, ChangelogOptions } from './schema'

/** 变更类型 → Keep a Changelog 区段名 */
const SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['feat', 'Added'],
  ['fix', 'Fixed'],
  ['perf', 'Changed'],
  ['change', 'Changed'],
  ['deprecate', 'Deprecated'],
  ['remove', 'Removed'],
  ['security', 'Security'],
  ['doc', 'Docs'],
] as const

const SECTION_LABEL: Record<string, string> = Object.fromEntries(SECTIONS)

interface Grouped {
  [section: string]: string[]
}

/** 解析每行 `type: 描述`；无法识别类型的归入 Changed */
export function groupChanges(text: string): Grouped {
  const grouped: Grouped = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^[-*]\s*/, '')
    if (line === '') continue
    const m = line.match(/^([A-Za-z]+)\s*:\s*(.+)$/)
    if (m) {
      const type = m[1].toLowerCase()
      const section = SECTION_LABEL[type] ?? 'Changed'
      ;(grouped[section] ??= []).push(m[2].trim())
    } else {
      ;(grouped['Changed'] ??= []).push(line)
    }
  }
  return grouped
}

export function buildChangelog(version: string, changesText: string): string {
  const grouped = groupChanges(changesText)
  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push(`## [${version}] - ${date}`)
  const order = SECTIONS.map(([, s]) => s).concat(['Changed'])
  const seen = new Set<string>()
  for (const section of order) {
    if (!grouped[section] || seen.has(section)) continue
    seen.add(section)
    lines.push('', `### ${section}`)
    for (const item of grouped[section]) lines.push(`- ${item}`)
  }
  return lines.join('\n')
}

export function transform(input: ChangelogInput, options: ChangelogOptions): string {
  if (input.text.trim() === '' && options.version.trim() === '') return ''
  if (input.text.length > 20000) throw new Error('输入超过 20,000 字符上限')
  return buildChangelog(options.version.trim(), input.text)
}
