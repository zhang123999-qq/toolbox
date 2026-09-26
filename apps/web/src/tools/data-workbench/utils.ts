import type { WorkbenchInput, WorkbenchOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class DataWorkbenchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataWorkbenchError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 200_000

/** 单步结果进报告时的展示上限：中间结果只用于核对，超长就截断 */
const PREVIEW_LIMIT = 4_000

/** 执行一步的结果 */
export interface StepResult {
  readonly index: number
  readonly name: string
  readonly output: string
}

/** 一个流水线步骤 */
interface StepDef {
  readonly desc: string
  readonly run: (value: string, args: readonly string[]) => string
}

/** 行尾统一处理：本工具的中间值一律不带末尾换行，避免逐行操作产生累积空行 */
function lines(value: string): string[] {
  return value.split(/\r\n|\r|\n/)
}

/** 重新拼回多行，空输入返回空串 */
function join(linesOut: readonly string[]): string {
  return linesOut.join('\n')
}

/** 保留空行与否取决于具体步骤，这里是「按行处理」的统一壳 */
function mapLines(value: string, fn: (line: string) => string): string {
  return join(lines(value).map(fn))
}

/** 按行排序；中文场景用 zh-Hans-CN 的排序规则，避免只是在按码位排 */
function sorted(value: string, descending: boolean): string {
  const rows = lines(value)
  rows.sort((a, b) =>
    descending ? b.localeCompare(a, 'zh-Hans-CN') : a.localeCompare(b, 'zh-Hans-CN'),
  )
  return join(rows)
}

/** CSV 文本 → 二维数组（支持引号内的换行） */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] | null = null
  let current = ''
  let quoted = false
  let hasCell = false

  const pushCell = (): void => {
    row = row ?? []
    row.push(hasCell || current !== '' ? current : '')
    current = ''
    hasCell = false
  }
  const pushRow = (): void => {
    if (row === null) return
    rows.push(row)
    row = null
  }

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        current += '"'
        i += 1
        continue
      }
      quoted = !quoted
      hasCell = true
      continue
    }
    if (!quoted && ch === ',') {
      pushCell()
      continue
    }
    if (!quoted && (ch === '\n' || ch === '\r')) {
      // \r\n 算一个行尾
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      pushCell()
      pushRow()
      continue
    }
    current += ch ?? ''
    hasCell = true
  }
  pushCell()
  pushRow()
  return rows.filter((cells) => cells.some((cell) => cell !== ''))
}

/** 二维表 → JSON 数组（首行当表头） */
export function csvToJson(text: string, header: boolean): string {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return '[]'
  if (!header) return JSON.stringify(rows, null, 2)
  const head = rows[0] ?? []
  const out = rows.slice(1).map((cells) => {
    const record: Record<string, string> = {}
    head.forEach((key, index) => {
      record[key] = cells[index] ?? ''
    })
    return record
  })
  return JSON.stringify(out, null, 2)
}

// ---------------------------------------------------------------------------
// YAML：自实现的子集
// ---------------------------------------------------------------------------

/** 需要加引号的标量：空串、看起来像别种类型、含 YAML 敏感符号或首尾空白 */
function needsQuote(value: string): boolean {
  if (value === '') return true
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(value)) return true
  if (/[:#]\s|\s$/.test(value)) return true
  if (/^(true|false|null|yes|no|~)$/i.test(value)) return true
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(value)) return true
  return false
}

/** 标量加单引号并转义内部的单引号 */
function quoteScalar(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** JSON → YAML 文本（缩进展开） */
function toYamlLines(value: unknown, indent: number, indentSize: number): string[] {
  const pad = ' '.repeat(indent)
  if (value === null || value === undefined) return [`${pad}null`]
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${pad}[]`]
    const out: string[] = []
    for (const item of value) {
      if (item !== null && typeof item === 'object') {
        const children = toYamlLines(item, indent + indentSize, indentSize)
        // 复杂元素的首行用 `- ` 与后续行对齐，这是 YAML 序列里最常见的写法
        const head = children[0] ?? ''
        out.push(`${pad}- ${head.trimStart()}`)
        out.push(...children.slice(1))
      } else {
        const text = String(item)
        out.push(`${pad}- ${needsQuote(text) ? quoteScalar(text) : text}`)
      }
    }
    return out
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return [`${pad}{}`]
    const out: string[] = []
    for (const [key, rawValue] of entries) {
      const safeKey = needsQuote(key) ? quoteScalar(key) : key
      if (rawValue !== null && typeof rawValue === 'object') {
        out.push(`${pad}${safeKey}:`)
        out.push(...toYamlLines(rawValue, indent + indentSize, indentSize))
      } else if (rawValue === null) {
        out.push(`${pad}${safeKey}: null`)
      } else if (typeof rawValue === 'boolean' || typeof rawValue === 'number') {
        out.push(`${pad}${safeKey}: ${String(rawValue)}`)
      } else {
        const text = String(rawValue)
        out.push(`${pad}${safeKey}: ${needsQuote(text) ? quoteScalar(text) : text}`)
      }
    }
    return out
  }
  const text = String(value)
  return [pad + (needsQuote(text) ? quoteScalar(text) : text)]
}

/** JSON 文本 → YAML 文本 */
export function jsonToYaml(text: string, indentSize: number): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new DataWorkbenchError('json2yaml 失败：输入不是合法的 JSON')
  }
  return toYamlLines(parsed, 0, indentSize).join('\n')
}

/** YAML 的一行：缩进 + 去掉注释后的内容 */
interface YamlLine {
  readonly indent: number
  readonly text: string
}

/** 去掉行尾注释（引号内的 # 不算） */
function stripYamlComment(text: string): string {
  let quote = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote !== '') {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      continue
    }
    if (ch === '#' && (i === 0 || (text[i - 1] ?? '').match(/\s/) !== null)) {
      return text.slice(0, i).trimEnd()
    }
  }
  return text.trimEnd()
}

/** 预处理：过滤空行与纯注释行，记录缩进 */
function yamlLines(text: string): YamlLine[] {
  return lines(text)
    .map((line) => ({ indent: line.length - line.trimStart().length, raw: line.trim() }))
    .filter((item) => item.raw !== '')
    .map((item) => ({ indent: item.indent, text: stripYamlComment(item.raw) }))
    .filter((item) => item.text !== '')
}

/** 标量解析：先处理引号，再还原布尔 / 数字 / null */
function parseYamlScalar(text: string): unknown {
  const value = text.trim()
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'")
  if (/^".*"$/.test(value)) return JSON.parse(value) as unknown
  if (/^(true|yes)$/i.test(value)) return true
  if (/^(false|no)$/i.test(value)) return false
  if (/^(null|~)$/i.test(value)) return null
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d*\.\d+([eE][-+]?\d+)?$/.test(value)) return Number(value)
  return value
}

/**
 * YAML → JSON（子集）。
 * 支持块映射、块序列、引号标量与常见字面量；不支持流集合 `[a,b]`、锚点、
 * 多文档、块标量（`|` / `>`）与复杂键。详细说明见 README「限制」。
 */
export function yamlToJson(text: string, indentSize: number): string {
  const rows = yamlLines(text)
  if (rows.length === 0) throw new DataWorkbenchError('yaml2json 失败：输入为空')
  const [value] = parseYamlBlock(rows, 0, rows[0]?.indent ?? 0)
  return JSON.stringify(value, null, indentSize)
}

/** 按缩进递归解析一个块 */
function parseYamlBlock(
  rows: readonly YamlLine[],
  from: number,
  indent: number,
): [unknown, number] {
  const head = rows[from]
  if (head === undefined) return [null, from]
  if (head.text === '-' || head.text.startsWith('- ')) {
    return parseYamlSequence(rows, from, indent)
  }
  return parseYamlMapping(rows, from, indent)
}

/** 取接下来缩进更深的子块 */
function childIndent(rows: readonly YamlLine[], from: number, indent: number): number | null {
  const next = rows[from]
  if (next === undefined || next.indent <= indent) return null
  return next.indent
}

/** 块映射：连续若干 `key: value` 行，value 为空时看下一层缩进 */
function parseYamlMapping(
  rows: readonly YamlLine[],
  from: number,
  indent: number,
): [unknown, number] {
  const out: Record<string, unknown> = {}
  let index = from
  while (index < rows.length) {
    const row = rows[index]
    if (row === undefined) break
    if (row.indent !== indent) break
    if (row.text === '-' || row.text.startsWith('- ')) break
    const match = /^([^:]+):(.*)$/.exec(row.text)
    if (!match) {
      index += 1
      continue
    }
    const key = String(parseYamlScalar((match[1] ?? '').trim()))
    const rest = (match[2] ?? '').trim()
    index += 1
    if (rest === '') {
      const deeper = childIndent(rows, index, indent)
      if (deeper === null) {
        out[key] = null
        continue
      }
      const [child, next] = parseYamlBlock(rows, index, deeper)
      out[key] = child
      index = next
      continue
    }
    out[key] = parseYamlScalar(rest)
  }
  return [out, index]
}

/** 块序列：连续若干 `- value` 行；value 后面可以跟更深缩进的子块 */
function parseYamlSequence(
  rows: readonly YamlLine[],
  from: number,
  indent: number,
): [unknown, number] {
  const items: unknown[] = []
  let index = from
  while (index < rows.length) {
    const row = rows[index]
    if (row === undefined) break
    if (row.indent !== indent) break
    if (!(row.text === '-' || row.text.startsWith('- '))) break
    const content = row.text === '-' ? '' : row.text.slice(1).trim()
    index += 1

    // 收集本条目独有的更深行（下一个同级条目之前的都属于它）
    const owned: YamlLine[] = []
    while (index < rows.length) {
      const candidate = rows[index]
      if (candidate === undefined || candidate.indent <= indent) break
      owned.push(candidate)
      index += 1
    }

    if (content === '') {
      if (owned.length === 0) {
        items.push(null)
        continue
      }
      const [child] = parseYamlBlock(owned, 0, owned[0]?.indent ?? indent)
      items.push(child)
      continue
    }
    if (owned.length === 0 || !/^[^:]+:( |$)/.test(content)) {
      items.push(parseYamlScalar(content))
      continue
    }
    // `- name: a` 这种行内起头的映射：把它接到更深的行序列前面一起解析
    const merged: YamlLine[] = [{ indent: owned[0]?.indent ?? indent, text: content }, ...owned]
    const [child] = parseYamlMapping(merged, 0, merged[0]?.indent ?? indent)
    items.push(child)
  }
  return [items, index]
}

// ---------------------------------------------------------------------------
// 步骤表
// ---------------------------------------------------------------------------

/** 单个步骤最多给几个参数 */
function arg(args: readonly string[], index: number, fallback: string): string {
  return args[index] ?? fallback
}

const STEPS: Readonly<Record<string, StepDef>> = {
  upper: { desc: '转大写', run: (value) => value.toUpperCase() },
  lower: { desc: '转小写', run: (value) => value.toLowerCase() },
  trim: { desc: '去掉首尾空白', run: (value) => value.trim() },
  trimlines: { desc: '去掉每行首尾空白', run: (value) => mapLines(value, (line) => line.trim()) },
  collapse: {
    desc: '折叠连续空白为一个空格',
    run: (value) => mapLines(value, (line) => line.replace(/\s+/g, ' ').trim()),
  },
  removeempty: {
    desc: '删除空行',
    run: (value) => join(lines(value).filter((line) => line.trim() !== '')),
  },
  dedupe: {
    desc: '删除重复行（保留首次出现）',
    run: (value) => join([...new Set(lines(value))]),
  },
  sort: { desc: '按行升序', run: (value) => sorted(value, false) },
  sortdesc: { desc: '按行降序', run: (value) => sorted(value, true) },
  reverse: { desc: '反转行顺序', run: (value) => join([...lines(value)].reverse()) },
  jsonformat: {
    desc: 'JSON 美化，参数为缩进空格数',
    run: (value, args) => {
      const indent = Number.parseInt(arg(args, 0, '2'), 10)
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        throw new DataWorkbenchError('jsonFormat 失败：输入不是合法的 JSON')
      }
      return JSON.stringify(parsed, null, Number.isFinite(indent) ? indent : 2)
    },
  },
  jsonminify: {
    desc: 'JSON 压成单行',
    run: (value) => {
      try {
        return JSON.stringify(JSON.parse(value) as unknown)
      } catch {
        throw new DataWorkbenchError('jsonMinify 失败：输入不是合法的 JSON')
      }
    },
  },
  json2yaml: {
    desc: 'JSON 转 YAML，参数为缩进空格数',
    run: (value, args) => jsonToYaml(value, Number.parseInt(arg(args, 0, '2'), 10) || 2),
  },
  yaml2json: {
    desc: 'YAML 转 JSON，参数为缩进空格数',
    run: (value, args) => yamlToJson(value, Number.parseInt(arg(args, 0, '2'), 10) || 2),
  },
  csv2json: {
    desc: 'CSV 转 JSON；参数 noheader 表示首行不是表头',
    run: (value, args) => csvToJson(value, arg(args, 0, '').toLowerCase() !== 'noheader'),
  },
  json2csv: {
    desc: 'JSON 对象数组转 CSV',
    run: (value) => {
      let rows: unknown
      try {
        rows = JSON.parse(value)
      } catch {
        throw new DataWorkbenchError('json2csv 失败：输入不是合法的 JSON')
      }
      if (!Array.isArray(rows) || rows.length === 0) return ''
      const first = rows[0] as Record<string, unknown>
      const keys = Object.keys(first ?? {})
      const escape = (cell: unknown): string => {
        const text = cell === null || cell === undefined ? '' : String(cell)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }
      const table = [
        keys.join(','),
        ...rows.map((row) =>
          keys.map((key) => escape((row as Record<string, unknown>)[key])).join(','),
        ),
      ]
      return join(table)
    },
  },
  base64: {
    desc: 'UTF-8 字节转 Base64',
    run: (value) => {
      const bytes = new TextEncoder().encode(value)
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    },
  },
  base64decode: {
    desc: 'Base64 还原为文本',
    run: (value) => {
      // 先自检字符集再解码：部分实现的 atob 会对非法输入“尽力出结果”而不报错
      const cleaned = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
      // 长度余 1 永远不可能对齐到 4 的分组，是明确的非法输入
      const invalid =
        cleaned !== '' &&
        (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned) || cleaned.replace(/=+$/, '').length % 4 === 1)
      if (invalid) throw new DataWorkbenchError('base64Decode 失败：输入不是合法的 Base64')
      try {
        const binary = atob(cleaned)
        const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
        return new TextDecoder().decode(bytes)
      } catch {
        throw new DataWorkbenchError('base64Decode 失败：输入不是合法的 Base64')
      }
    },
  },
  urlencode: { desc: 'URL 编码（整个串）', run: (value) => encodeURIComponent(value) },
  urldecode: {
    desc: 'URL 解码',
    run: (value) => {
      try {
        return decodeURIComponent(value)
      } catch {
        throw new DataWorkbenchError('urlDecode 失败：百分号转义不合法')
      }
    },
  },
  hex: {
    desc: 'UTF-8 字节转十六进制',
    run: (value) => {
      const bytes = new TextEncoder().encode(value)
      let out = ''
      for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
      return out
    },
  },
  hexdecode: {
    desc: '十六进制还原为文本',
    run: (value) => {
      const cleaned = value.replace(/\s+/g, '').replace(/^0x/i, '')
      if (cleaned === '') return ''
      if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length % 2 !== 0) {
        throw new DataWorkbenchError('hexDecode 失败：输入不是偶数长度的十六进制串')
      }
      const bytes = new Uint8Array(cleaned.length / 2)
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
      }
      return new TextDecoder().decode(bytes)
    },
  },
  replace: {
    desc: '字面替换，参数为 被替换,替换为',
    run: (value, args) => {
      const from = arg(args, 0, '')
      if (from === '') throw new DataWorkbenchError('replace 需要给参数，例如 replace(a,b)')
      return value.split(from).join(arg(args, 1, ''))
    },
  },
  replaceregex: {
    desc: '正则替换，参数为 模式,替换为',
    run: (value, args) => {
      const pattern = arg(args, 0, '')
      if (pattern === '') {
        throw new DataWorkbenchError('replaceRegex 需要给参数，例如 replaceRegex(\\d+,N)')
      }
      let regex: RegExp
      try {
        regex = new RegExp(pattern, arg(args, 2, '') || 'g')
      } catch {
        throw new DataWorkbenchError(`replaceRegex 失败：正则 “${pattern}” 不合法`)
      }
      return value.replace(regex, arg(args, 1, ''))
    },
  },
  prefix: {
    desc: '每行加前缀',
    run: (value, args) => mapLines(value, (line) => arg(args, 0, '') + line),
  },
  suffix: {
    desc: '每行加后缀',
    run: (value, args) => mapLines(value, (line) => line + arg(args, 0, '')),
  },
  linecount: {
    desc: '输出行数与字符数统计',
    run: (value) =>
      `行数 ${lines(value).length} · 字符 ${value.length} · 字节 ${new TextEncoder().encode(value).length}`,
  },
}

/** 所有步骤名，报错时列出给用户看 */
export function stepNames(): readonly string[] {
  return Object.keys(STEPS).sort()
}

/** 切一行 -> { name, args }；跳过空行与 # 注释 */
export function parseStepLine(line: string): { name: string; args: readonly string[] } | null {
  const text = line.split('#')[0]?.trim() ?? ''
  if (text === '') return null
  const match = /^([A-Za-z][A-Za-z0-9]*)\s*(?:\(([^)]*)\))?$/.exec(text)
  if (!match) {
    throw new DataWorkbenchError(
      `无法识别的步骤“${text}”：应写成 名称 或 名称(参数1,参数2)。可用步骤：${stepNames().join('、')}`,
    )
  }
  const name = (match[1] ?? '').toLowerCase()
  if (!STEPS[name]) {
    throw new DataWorkbenchError(`未知的步骤 ${name}。可用步骤：${stepNames().join('、')}`)
  }
  const rawArgs = match[2] ?? ''
  return { name, args: rawArgs === '' ? [] : rawArgs.split(',').map((part) => part.trim()) }
}

/** 依次执行步骤，返回每一步的输出 */
export function runPipeline(input: string, options: WorkbenchOptions): readonly StepResult[] {
  const results: StepResult[] = []
  let current = input
  let index = 0

  for (const line of lines(options.steps)) {
    const parsed = parseStepLine(line)
    if (!parsed) continue
    const step = STEPS[parsed.name]
    if (!step) throw new DataWorkbenchError(`未知的步骤 ${parsed.name}`)
    index += 1
    current = step.run(current, parsed.args)
    results.push({
      index,
      name: `${parsed.name}${parsed.args.length > 0 ? '(' + parsed.args.join(',') + ')' : ''}`,
      output: current,
    })
  }
  return results
}

/** 中间结果过长时截断，避免几十步的流水线把输出区撑爆 */
function preview(value: string): string {
  if (value.length <= PREVIEW_LIMIT) return value
  return `${value.slice(0, PREVIEW_LIMIT)}\n…（本步结果 ${value.length} 字符，已截断显示前 ${PREVIEW_LIMIT} 字符）`
}

/** 排成一串「每步标题 + 结果」的可读报告 */
export function formatPipeline(input: string, results: readonly StepResult[]): string {
  if (results.length === 0) return '（没有可执行的步骤，请在「流水线步骤」里每行写一个步骤）'
  const blocks: string[] = [`== 输入 ==`, `${lines(input).length} 行 / ${input.length} 字符`]
  for (const result of results) {
    blocks.push(
      [
        '',
        `== 步骤 ${result.index} · ${result.name} ==`,
        `${lines(result.output).length} 行 / ${result.output.length} 字符`,
        preview(result.output),
      ].join('\n'),
    )
  }
  const last = results[results.length - 1]
  blocks.push('', '== 最终结果 ==', preview(last?.output ?? ''))
  return blocks.join('\n')
}

/**
 * 数据转换工作台 —— 纯函数，不依赖 React / DOM，可独立单测。
 * 空输入返回空串；超长输入按此项目的统一口径抛错。
 */
export function transform(input: WorkbenchInput, options: WorkbenchOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new DataWorkbenchError('输入超过 200,000 字符上限')
  }
  const results = runPipeline(input.text, options)
  if (options.mode === 'final') return results[results.length - 1]?.output ?? ''
  return formatPipeline(input.text, results)
}
