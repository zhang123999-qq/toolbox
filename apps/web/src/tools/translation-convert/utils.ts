/**
 * translation-convert（#726）纯函数：i18n 文件格式互转（JSON / PO / YAML / CSV）。
 *
 * 内部统一用拍平条目 [{key, value}]（key 为点路径）中转：
 * parseI18n 解析 → serializeI18n 序列化。YAML / PO 均为手写简易解析器，
 * 只覆盖 i18n 常见结构，复杂结构抛中文错。
 */

export type I18nFormat = 'json' | 'po' | 'yaml' | 'csv'

export interface I18nEntry {
  readonly key: string
  readonly value: string
}

const FORMATS: readonly I18nFormat[] = ['json', 'po', 'yaml', 'csv']

export const FORMAT_LABELS: Readonly<Record<I18nFormat, string>> = {
  json: 'JSON',
  po: 'PO (gettext)',
  yaml: 'YAML',
  csv: 'CSV',
}

function assertFormat(format: string): asserts format is I18nFormat {
  if (!FORMATS.includes(format as I18nFormat)) {
    throw new Error(`不支持的格式「${format}」：仅支持 json / po / yaml / csv`)
  }
}

/**
 * 把嵌套 JSON 对象拍平为点路径条目。叶子值转字符串；数组 / null 暂不支持。
 */
export function flattenJson(value: unknown): I18nEntry[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON 顶层必须是对象')
  }
  const out: I18nEntry[] = []
  const walk = (node: unknown, path: string): void => {
    if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
      for (const k of Object.keys(node as Record<string, unknown>)) {
        walk((node as Record<string, unknown>)[k], path === '' ? k : `${path}.${k}`)
      }
      return
    }
    if (Array.isArray(node)) {
      throw new Error(`键「${path}」是数组：暂不支持数组结构`)
    }
    if (node === null || node === undefined) {
      throw new Error(`键「${path}」的值为空：请填字符串后再转换`)
    }
    out.push({ key: path, value: String(node) })
  }
  walk(value, '')
  return out
}

/**
 * 把点路径条目还原为嵌套对象。空键 / 空路径段 / 重复键 / 路径冲突抛中文错。
 */
export function unflattenJson(entries: readonly I18nEntry[]): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  for (const { key, value } of entries) {
    if (key.trim() === '') throw new Error('存在空键')
    const parts = key.split('.')
    if (parts.some((p) => p === '')) throw new Error(`键「${key}」含空路径段`)
    let node: Record<string, unknown> = root
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i]
      const next = node[p]
      if (next === undefined) {
        const child: Record<string, unknown> = {}
        node[p] = child
        node = child
      } else if (next !== null && typeof next === 'object' && !Array.isArray(next)) {
        node = next as Record<string, unknown>
      } else {
        throw new Error(`键「${key}」与「${parts.slice(0, i + 1).join('.')}」路径冲突`)
      }
    }
    const last = parts[parts.length - 1]
    if (node[last] !== undefined) throw new Error(`键「${key}」重复`)
    node[last] = value
  }
  return root
}

function parseJsonI18n(input: string): I18nEntry[] {
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    throw new Error('JSON 解析失败：请检查括号、引号与逗号')
  }
  return flattenJson(data)
}

/** 反转义 PO 字符串字面量（\\n \\t \\" \\\\） */
function unescapePo(s: string): string {
  return s.replace(/\\(\\|n|t|")/g, (_m: string, c: string) => {
    if (c === 'n') return '\n'
    if (c === 't') return '\t'
    return c
  })
}

function poLineString(s: string, lineNo: number): string {
  const m = /^"(.*)"$/.exec(s)
  if (!m) throw new Error(`PO 第 ${lineNo} 行格式错误：字符串须用双引号包裹`)
  return unescapePo(m[1])
}

interface PoDraft {
  msgid?: string
  msgstrs: string[]
}

/**
 * 简易 PO 解析：msgid/msgstr 对、多行续接、复数取 msgstr[0]。
 * 头信息（空 msgid）跳过；注释行忽略。
 */
function parsePo(input: string): I18nEntry[] {
  const entries: I18nEntry[] = []
  const draft: PoDraft = { msgstrs: [] }
  let target: 'msgid' | 'msgstr' | 'plural' | 'none' = 'none'

  const flush = (): void => {
    if (draft.msgid !== undefined && draft.msgid !== '') {
      entries.push({ key: draft.msgid, value: draft.msgstrs[0] ?? '' })
    }
    draft.msgid = undefined
    draft.msgstrs.length = 0
  }

  const lines = input.split('\n')
  for (let idx = 0; idx < lines.length; idx += 1) {
    const lineNo = idx + 1
    const line = lines[idx]
    const trimmed = line.trim()
    if (trimmed === '') {
      flush()
      target = 'none'
      continue
    }
    if (trimmed.startsWith('#')) continue
    if (trimmed.startsWith('msgid_plural')) {
      poLineString(trimmed.slice('msgid_plural'.length).trim(), lineNo)
      target = 'plural'
      continue
    }
    if (trimmed.startsWith('msgid')) {
      flush()
      draft.msgid = poLineString(trimmed.slice('msgid'.length).trim(), lineNo)
      target = 'msgid'
      continue
    }
    if (trimmed.startsWith('msgstr[')) {
      const close = trimmed.indexOf(']')
      const n = Number(trimmed.slice('msgstr['.length, close))
      if (close === -1 || !Number.isInteger(n) || n < 0) {
        throw new Error(`PO 第 ${lineNo} 行 msgstr 索引非法`)
      }
      draft.msgstrs[n] = poLineString(trimmed.slice(close + 1).trim(), lineNo)
      target = 'msgstr'
      continue
    }
    if (trimmed.startsWith('msgstr')) {
      draft.msgstrs = [poLineString(trimmed.slice('msgstr'.length).trim(), lineNo)]
      target = 'msgstr'
      continue
    }
    if (trimmed.startsWith('"')) {
      const piece = poLineString(trimmed, lineNo)
      if (target === 'msgid' && draft.msgid !== undefined) draft.msgid += piece
      else if (target === 'msgstr') draft.msgstrs[draft.msgstrs.length - 1] += piece
      else if (target === 'plural') {
        // msgid_plural 续行：复数形式不参与键名，仅校验语法后忽略
      }
      else throw new Error(`PO 第 ${lineNo} 行：孤立的字符串续行`)
      continue
    }
    throw new Error(`PO 第 ${lineNo} 行无法识别：${trimmed.slice(0, 24)}`)
  }
  flush()
  return entries
}

function stripYamlQuotes(s: string): string {
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    const inner = s.slice(1, -1)
    return s[0] === '"' ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner.replace(/''/g, "'")
  }
  return s
}

/**
 * 简易 YAML 解析：仅支持「key: value」映射嵌套（空格缩进）。
 * 列表、制表符缩进、多行块标量等暂不支持，遇到抛中文错。
 */
function parseYaml(input: string): I18nEntry[] {
  const root: Record<string, unknown> = {}
  const stack: { indent: number; node: Record<string, unknown> }[] = [{ indent: -1, node: root }]
  const lines = input.split('\n')
  for (let idx = 0; idx < lines.length; idx += 1) {
    const lineNo = idx + 1
    const raw = lines[idx]
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    if (raw.includes('\t')) throw new Error(`YAML 第 ${lineNo} 行含制表符：请改用空格缩进`)
    if (/^-\s/.test(trimmed) || trimmed === '-') throw new Error(`YAML 第 ${lineNo} 行是列表项：暂不支持列表`)
    const indent = raw.length - raw.trimStart().length
    const m = /^([^:]*):(.*)$/.exec(trimmed)
    if (!m) throw new Error(`YAML 第 ${lineNo} 行格式错误：应为「key: value」`)
    const key = m[1].trim()
    const rawVal = m[2].trim()
    if (key === '') throw new Error(`YAML 第 ${lineNo} 行键为空`)
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const parent = stack[stack.length - 1].node
    if (parent[key] !== undefined) throw new Error(`YAML 第 ${lineNo} 行键「${key}」重复`)
    if (rawVal === '') {
      const child: Record<string, unknown> = {}
      parent[key] = child
      stack.push({ indent, node: child })
    } else {
      parent[key] = stripYamlQuotes(rawVal)
    }
  }
  return flattenJson(root)
}

/** 解析一行 CSV（处理引号、逗号与 "" 转义） */
function splitCsvLine(line: string, lineNo: number): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      if (cur !== '') throw new Error(`CSV 第 ${lineNo} 行引号位置非法`)
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (inQuotes) throw new Error(`CSV 第 ${lineNo} 行引号未闭合`)
  cells.push(cur)
  return cells
}

function parseCsv(input: string): I18nEntry[] {
  const lines = input.split('\n')
  const rows: string[][] = []
  for (let idx = 0; idx < lines.length; idx += 1) {
    if (lines[idx].trim() === '') continue
    rows.push(splitCsvLine(lines[idx], idx + 1))
  }
  let start = 0
  const head = rows[0]
  if (head[0].trim().toLowerCase() === 'key' && (head[1] ?? '').trim().toLowerCase() === 'value') {
    start = 1
  }
  const entries: I18nEntry[] = []
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i]
    if (row.length < 2) throw new Error(`CSV 第 ${i + 1} 行缺少 value 列`)
    const key = row[0].trim()
    if (key === '') throw new Error(`CSV 第 ${i + 1} 行键为空`)
    entries.push({ key, value: row[1] })
  }
  if (entries.length === 0) throw new Error('CSV 中没有数据行')
  return entries
}

/**
 * 解析 i18n 文本为拍平条目。空输入 / 未知格式抛中文错。
 */
export function parseI18n(input: string, format: I18nFormat): I18nEntry[] {
  assertFormat(format)
  if (input.trim() === '') throw new Error('请输入待转换的内容')
  switch (format) {
    case 'json':
      return parseJsonI18n(input)
    case 'po':
      return parsePo(input)
    case 'yaml':
      return parseYaml(input)
    case 'csv':
      return parseCsv(input)
  }
}

function poQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`
}

function csvCell(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function yamlQuote(s: string): string {
  return /[:#\n"'[\]{}]/.test(s) || s.trim() !== s || s === '' ? JSON.stringify(s) : s
}

function yamlLines(node: Record<string, unknown>, indent: number): string[] {
  const pad = '  '.repeat(indent)
  const out: string[] = []
  for (const [k, v] of Object.entries(node)) {
    if (v !== null && typeof v === 'object') {
      out.push(`${pad}${k}:`, ...yamlLines(v as Record<string, unknown>, indent + 1))
    } else {
      out.push(`${pad}${k}: ${yamlQuote(String(v))}`)
    }
  }
  return out
}

/**
 * 把拍平条目序列化为目标格式。
 */
export function serializeI18n(entries: readonly I18nEntry[], to: I18nFormat): string {
  assertFormat(to)
  switch (to) {
    case 'json':
      return JSON.stringify(unflattenJson(entries), null, 2)
    case 'po':
      return entries.map((e) => `msgid ${poQuote(e.key)}\nmsgstr ${poQuote(e.value)}`).join('\n\n') + (entries.length > 0 ? '\n' : '')
    case 'yaml': {
      const body = yamlLines(unflattenJson(entries), 0).join('\n')
      return body === '' ? '' : body + '\n'
    }
    case 'csv':
      return 'key,value\n' + entries.map((e) => `${csvCell(e.key)},${csvCell(e.value)}`).join('\n')
  }
}

/**
 * 一步转换：解析源格式 → 序列化为目标格式。返回转换后的文本与条目数。
 */
export function convertI18n(
  input: string,
  from: I18nFormat,
  to: I18nFormat,
): { text: string; count: number } {
  const entries = parseI18n(input, from)
  return { text: serializeI18n(entries, to), count: entries.length }
}
