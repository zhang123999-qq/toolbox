import type { YamlToJsonInput, YamlToJsonOptions } from './schema'

/**
 * YAML ⇄ JSON 互转核心（纯函数，无 React、无 DOM 依赖）。
 *
 * 为什么自己写解析器：规范禁止新增 npm 依赖，因此这里实现的是 YAML 1.2 的一个子集
 * （块映射 / 块序列 / 流式集合 / 注释 / 引号标量 / 块标量），覆盖日常配置文件的绝大多数写法；
 * 不支持的语法一律抛带行列位置的中文错误，而不是静默产出错误结果。
 * 与 yaml-formatter 是同一套解析思路的独立副本（工具之间禁止互相 import）。
 */

/** 输入非法或语法不支持时抛出，由 UI 捕获展示 */
export class YamlToJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'YamlToJsonError'
  }
}

/** 解析产物只使用 JSON 能表达的 6 种形态，保证后续可无损转 JSON / XML */
export type YamlValue =
  null | boolean | number | string | YamlValue[] | { [key: string]: YamlValue }

const MAX_INPUT = 1_000_000

/** 统一失败出口：行列位置直接来自原始行号，用户能立刻跳到出错的那一行 */
function fail(line: number, column: number, message: string): never {
  throw new YamlToJsonError(`第 ${line} 行第 ${column} 列：${message}`)
}

/** 块标量（`|` / `>`）收集到的原始行 */
interface BlockScalar {
  readonly style: '|' | '>'
  readonly chomp: '' | '-' | '+'
  readonly lines: readonly string[]
}

/** 一个「有意义」的逻辑行：空行与纯注释行已被剔除 */
interface Line {
  readonly line: number
  readonly indent: number
  /** 内容起始列；序列项指向 `- ` 之后，便于把 `- k: v` 当作普通映射处理 */
  readonly col: number
  readonly text: string
  readonly isItem: boolean
  readonly block: BlockScalar | null
  readonly head: readonly string[]
  readonly inline: string | null
}

/** 挂在某个 JSON Pointer 路径上的注释 */
interface Comments {
  readonly head: readonly string[]
  readonly inline: string | null
}

interface ScanResult {
  readonly lines: readonly Line[]
  readonly preamble: readonly string[]
  readonly tail: readonly string[]
}

interface Parsed {
  readonly value: YamlValue
  readonly comments: ReadonlyMap<string, Comments>
  readonly preamble: readonly string[]
  readonly tail: readonly string[]
  /** 文档里没有任何结构行（只有注释）：输出时不应补一个 null */
  readonly empty: boolean
}

/** 位置游标：解析函数之间共享，避免返回元组下标带来的错位 */
interface Cursor {
  i: number
}

// ---------------------------------------------------------------------------
// 词法：把源码切成逻辑行，并处理注释与块标量
// ---------------------------------------------------------------------------

function countIndent(rawLine: string, line: number): number {
  let n = 0
  while (n < rawLine.length && rawLine[n] === ' ') n += 1
  if (rawLine[n] === '\t') fail(line, n + 1, '不支持 Tab 缩进，请改用空格')
  return n
}

/** 去掉行尾注释；`#` 只有在引号外、且位于行首或空白之后才算注释 */
function stripComment(body: string, line: number): { text: string; inline: string | null } {
  let quote: string | null = null
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '#' && (i === 0 || body[i - 1] === ' ' || body[i - 1] === '\t')) {
      return { text: body.slice(0, i).trimEnd(), inline: body.slice(i).trimEnd() }
    }
  }
  if (quote !== null) fail(line, body.length + 1, '引号未闭合')
  return { text: body.trimEnd(), inline: null }
}

/**
 * 收集块标量的内容行。
 * 缩进由第一行非空内容决定（YAML 规范也是这么定的），因此 `|` 下的内容不必对齐到固定列。
 */
function collectBlock(
  raw: readonly string[],
  start: number,
  parentIndent: number,
): { lines: string[]; next: number } {
  const out: string[] = []
  let contentIndent = -1
  let j = start
  for (; j < raw.length; j += 1) {
    const text = raw[j]
    if (text.trim() === '') {
      out.push('')
      continue
    }
    const indent = countIndent(text, j + 1)
    if (contentIndent === -1) {
      if (indent <= parentIndent) break
      contentIndent = indent
    } else if (indent < contentIndent) {
      break
    }
    out.push(text.slice(contentIndent))
  }
  return { lines: out, next: j }
}

/** 按 chomping 规则把块标量行拼成最终字符串 */
function blockToText(block: BlockScalar): string {
  const body = block.style === '|' ? block.lines.join('\n') : foldLines(block.lines)
  if (block.chomp === '-') return body.replace(/\n+$/, '')
  if (block.chomp === '+') return body
  return body.endsWith('\n') ? body : `${body}\n`
}

/** 折叠标量简化实现：连续非空行用空格拼接，空行代表一个换行 */
function foldLines(lines: readonly string[]): string {
  let out = ''
  for (const text of lines) {
    if (text === '') {
      out += '\n'
      continue
    }
    if (out !== '' && !out.endsWith('\n')) out += ' '
    out += text
  }
  return out
}

function scanLines(src: string): ScanResult {
  const raw = src.replace(/\r\n?/g, '\n').split('\n')
  const lines: Line[] = []
  const preamble: string[] = []
  const tail: string[] = []
  let pending: string[] = []
  let docStarted = false
  let ended = false

  for (let i = 0; i < raw.length; i += 1) {
    const lineNo = i + 1
    const trimmed = raw[i].trim()
    if (trimmed === '') {
      // 空行切断注释归属：文件头部的注释块不挂到第一个键上，而是留在文首
      if (pending.length > 0) {
        if (lines.length === 0) preamble.push(...pending)
        pending = []
      }
      continue
    }
    if (trimmed.startsWith('#')) {
      pending.push(trimmed)
      continue
    }
    if (ended) continue
    if (trimmed === '---') {
      // 只有开头的 `---` 算文档起始标记；出现在内容之后说明是多文档
      if (docStarted || lines.length > 0) fail(lineNo, 1, '暂不支持多文档（以 --- 分隔）')
      docStarted = true
      continue
    }
    if (trimmed === '...') {
      ended = true
      continue
    }

    const indent = countIndent(raw[i], lineNo)
    const { text, inline } = stripComment(raw[i].slice(indent), lineNo)

    let content = text
    let block: BlockScalar | null = null
    const header = /(^|[:\s])\s*([|>])([+-]?)$/.exec(content)
    if (header) {
      const style = header[2] === '>' ? '>' : '|'
      const chomp = (header[3] ?? '') as '' | '-' | '+'
      const collected = collectBlock(raw, i + 1, indent)
      content = content.slice(0, header.index + header[1].length).trimEnd()
      block = { style, chomp, lines: collected.lines }
      i = collected.next - 1
    }

    let isItem = false
    let col = indent
    if (content === '-' || content.startsWith('- ')) {
      isItem = true
      const after = content.slice(1)
      col = indent + 1 + (after.length - after.trimStart().length)
      content = after.trim()
    }
    lines.push({
      line: lineNo,
      indent,
      col,
      text: content,
      isItem,
      block,
      head: pending,
      inline,
    })
    pending = []
  }
  if (pending.length > 0) tail.push(...pending)
  return { lines, preamble, tail }
}

// ---------------------------------------------------------------------------
// 标量解析
// ---------------------------------------------------------------------------

/** 把纯文本标量还原成 JSON 类型；识别不了就当字符串，绝不静默丢字符 */
function toNumber(text: string): number | null {
  let sign = 1
  let body = text
  if (body[0] === '+' || body[0] === '-') {
    if (body[0] === '-') sign = -1
    body = body.slice(1)
  }
  if (body === '') return null
  if (/^\d[\d_]*$/.test(body)) return sign * Number(body.replace(/_/g, ''))
  if (/^0[xX][0-9a-fA-F][0-9a-fA-F_]*$/.test(body)) {
    return sign * Number.parseInt(body.slice(2).replace(/_/g, ''), 16)
  }
  if (/^0[oO][0-7][0-7_]*$/.test(body)) {
    return sign * Number.parseInt(body.slice(2).replace(/_/g, ''), 8)
  }
  if (/^0[bB][01][01_]*$/.test(body)) {
    return sign * Number.parseInt(body.slice(2).replace(/_/g, ''), 2)
  }
  if (/^(\d[\d_]*)?\.[\d_]*([eE][-+]?\d+)?$/.test(body) || /^\d[\d_]*[eE][-+]?\d+$/.test(body)) {
    const value = Number(body.replace(/_/g, ''))
    return Number.isNaN(value) ? null : sign * value
  }
  return null
}

/** 双引号内的转义还原：只处理 YAML 规范里最常见的几种 */
function unescapeDouble(body: string, line: number): string {
  let out = ''
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = body[i + 1]
    i += 1
    if (next === undefined) fail(line, i, '反斜杠后缺少转义字符')
    if (next === 'n') out += '\n'
    else if (next === 't') out += '\t'
    else if (next === 'r') out += '\r'
    else if (next === '0') out += '\0'
    else if (next === 'u' || next === 'U') {
      const width = next === 'u' ? 4 : 8
      const hex = body.slice(i + 1, i + 1 + width)
      if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(hex)) {
        fail(line, i + 1, `\\${next} 转义需要 ${width} 位十六进制`)
      }
      out += String.fromCodePoint(Number.parseInt(hex, 16))
      i += width
    } else out += next
  }
  return out
}

function parseQuoted(raw: string, line: number): string {
  if (raw[0] === '"') {
    if (raw.length < 2 || raw[raw.length - 1] !== '"') fail(line, 1, '双引号字符串未闭合')
    return unescapeDouble(raw.slice(1, -1), line)
  }
  if (raw.length < 2 || raw[raw.length - 1] !== "'") fail(line, 1, '单引号字符串未闭合')
  // 单引号里的 '' 表示一个字面单引号，其余字符原样保留
  return raw.slice(1, -1).replace(/''/g, "'")
}

function resolveScalar(raw: string, line: number): YamlValue {
  const text = raw.trim()
  if (text === '') return null
  if (text[0] === '"' || text[0] === "'") return parseQuoted(text, line)
  if (text === '~' || /^null$/i.test(text)) return null
  if (/^true$/i.test(text)) return true
  if (/^false$/i.test(text)) return false
  const num = toNumber(text)
  if (num !== null) return num
  return text
}

function isFlowStart(text: string): boolean {
  return text.startsWith('[') || text.startsWith('{')
}

// ---------------------------------------------------------------------------
// 键 / 值切分
// ---------------------------------------------------------------------------

/** 找出块映射里的 `key: value` 边界；找不到说明这一行不是映射项 */
function splitMapping(text: string, line: number): { key: string; rest: string } | null {
  let quote: string | null = null
  let depth = 0
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '[' || ch === '{') {
      depth += 1
      continue
    }
    if (ch === ']' || ch === '}') {
      depth -= 1
      continue
    }
    if (ch === ':' && depth === 0) {
      const next = text[i + 1]
      if (next === undefined || next === ' ' || next === '\t') {
        return { key: resolveKey(text.slice(0, i), line), rest: text.slice(i + 1).trim() }
      }
    }
  }
  return null
}

function resolveKey(raw: string, line: number): string {
  const text = raw.trim()
  if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
    return parseQuoted(text, line)
  }
  if (text.length >= 2 && text[0] === "'" && text[text.length - 1] === "'") {
    return parseQuoted(text, line)
  }
  return text
}

// ---------------------------------------------------------------------------
// 流式集合（必须写在同一行内）
// ---------------------------------------------------------------------------

function skipFlowSpace(src: string, cur: Cursor): void {
  while (cur.i < src.length && /\s/.test(src[cur.i])) cur.i += 1
}

function readFlowValue(src: string, cur: Cursor, line: number): YamlValue {
  skipFlowSpace(src, cur)
  const ch = src[cur.i]
  if (ch === undefined) fail(line, src.length + 1, '流式集合未闭合，缺少 ] 或 }')
  if (ch === '[') {
    cur.i += 1
    return readFlowSeq(src, cur, line)
  }
  if (ch === '{') {
    cur.i += 1
    return readFlowMap(src, cur, line)
  }
  const start = cur.i
  let quote: string | null = null
  let depth = 0
  while (cur.i < src.length) {
    const c = src[cur.i]
    if (quote !== null) {
      if (c === '\\' && quote === '"') cur.i += 2
      else {
        if (c === quote) quote = null
        cur.i += 1
      }
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      cur.i += 1
      continue
    }
    if (c === '[' || c === '{') depth += 1
    else if ((c === ']' || c === '}') && depth === 0) break
    else if (c === ']' || c === '}') depth -= 1
    else if (c === ',' && depth === 0) break
    cur.i += 1
  }
  return resolveScalar(src.slice(start, cur.i), line)
}

function readFlowSeq(src: string, cur: Cursor, line: number): YamlValue[] {
  const out: YamlValue[] = []
  for (;;) {
    skipFlowSpace(src, cur)
    if (src[cur.i] === ']') {
      cur.i += 1
      return out
    }
    out.push(readFlowValue(src, cur, line))
    skipFlowSpace(src, cur)
    const ch = src[cur.i]
    if (ch === ',') {
      cur.i += 1
      continue
    }
    if (ch === ']') {
      cur.i += 1
      return out
    }
    fail(line, cur.i + 1, '流式序列缺少 ] 或 ,')
  }
}

function readFlowMap(src: string, cur: Cursor, line: number): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = {}
  for (;;) {
    skipFlowSpace(src, cur)
    if (src[cur.i] === '}') {
      cur.i += 1
      return out
    }
    const key = readFlowKey(src, cur, line)
    out[key] = readFlowValue(src, cur, line)
    skipFlowSpace(src, cur)
    const ch = src[cur.i]
    if (ch === ',') {
      cur.i += 1
      continue
    }
    if (ch === '}') {
      cur.i += 1
      return out
    }
    fail(line, cur.i + 1, '流式映射缺少 } 或 ,')
  }
}

function readFlowKey(src: string, cur: Cursor, line: number): string {
  const start = cur.i
  let quote: string | null = null
  let depth = 0
  while (cur.i < src.length) {
    const c = src[cur.i]
    if (quote !== null) {
      if (c === '\\' && quote === '"') cur.i += 2
      else {
        if (c === quote) quote = null
        cur.i += 1
      }
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      cur.i += 1
      continue
    }
    if (c === '[' || c === '{') depth += 1
    else if (c === ']' || c === '}') {
      if (depth === 0) fail(line, cur.i + 1, '流式映射缺少 :')
      depth -= 1
    } else if (c === ':' && depth === 0) break
    else if (c === ',' && depth === 0) fail(line, cur.i + 1, '流式映射缺少 :')
    cur.i += 1
  }
  if (src[cur.i] !== ':') fail(line, cur.i + 1, '流式映射缺少 :')
  const key = resolveKey(src.slice(start, cur.i), line)
  cur.i += 1
  return key
}

function parseFlow(src: string, line: number): YamlValue {
  const cur: Cursor = { i: 0 }
  const value = readFlowValue(src, cur, line)
  skipFlowSpace(src, cur)
  if (cur.i < src.length) fail(line, cur.i + 1, '流式集合结束后还有多余字符')
  return value
}

// ---------------------------------------------------------------------------
// 块结构递归下降
// ---------------------------------------------------------------------------

/** JSON Pointer 片段转义，保证路径与键名一一对应 */
function escapeSeg(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1')
}

function parseNode(
  lines: readonly Line[],
  start: number,
  parentCol: number,
  path: string,
  comments: Map<string, Comments>,
): { value: YamlValue; next: number } {
  const first = lines[start]
  if (!first) return { value: null, next: start }
  if (first.isItem) return parseSeq(lines, start, first.indent, path, comments)
  if (isFlowStart(first.text)) return { value: parseFlow(first.text, first.line), next: start + 1 }
  if (splitMapping(first.text, first.line)) return parseMap(lines, start, first.col, path, comments)
  return parsePlainMulti(lines, start, parentCol)
}

/** 顶层是纯标量（可跨行折叠）的文档，例如一整段多行文本 */
function parsePlainMulti(
  lines: readonly Line[],
  start: number,
  parentCol: number,
): { value: YamlValue; next: number } {
  const first = lines[start]
  let text = first.text
  let i = start + 1
  while (i < lines.length) {
    const next = lines[i]
    if (next.indent <= parentCol || next.isItem || next.block || isFlowStart(next.text)) break
    if (splitMapping(next.text, next.line)) break
    text += ` ${next.text}`
    i += 1
  }
  return { value: resolveScalar(text, first.line), next: i }
}

function parseMap(
  lines: readonly Line[],
  start: number,
  keyCol: number,
  path: string,
  comments: Map<string, Comments>,
): { value: Record<string, YamlValue>; next: number } {
  const out: Record<string, YamlValue> = {}
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    // 首行允许带 `- ` 前缀（`- k: v` 形式的序列项），之后再遇到序列项就说明本映射结束了
    if (line.isItem && i !== start) break
    if (line.col < keyCol) break
    if (line.col > keyCol) {
      fail(line.line, line.col + 1, '缩进比同级键更深，但此处缺少「键: 值」结构')
    }
    const kv = splitMapping(line.text, line.line)
    if (!kv) fail(line.line, line.col + 1, '此处应为「键: 值」形式')
    const childPath = `${path}/${escapeSeg(kv.key)}`
    // 行首注释挂在键上；序列项里的首个键不再重复挂一次，避免注释输出两遍
    comments.set(childPath, {
      head: line.isItem ? [] : line.head,
      inline: line.isItem ? null : line.inline,
    })

    if (line.block) {
      out[kv.key] = blockToText(line.block)
      i += 1
      continue
    }
    if (kv.rest !== '') {
      out[kv.key] = isFlowStart(kv.rest)
        ? parseFlow(kv.rest, line.line)
        : resolveScalar(kv.rest, line.line)
      i += 1
      // 纯标量可以跨行续写，续行比键更深且不是新的键
      if (typeof out[kv.key] === 'string' && !isFlowStart(kv.rest)) {
        while (i < lines.length) {
          const next = lines[i]
          if (next.indent <= keyCol || next.isItem || next.block || isFlowStart(next.text)) break
          if (splitMapping(next.text, next.line)) break
          out[kv.key] = `${out[kv.key] as string} ${next.text}`
          i += 1
        }
      }
      continue
    }

    const next = lines[i + 1]
    if (next && next.isItem && next.indent >= keyCol) {
      const seq = parseSeq(lines, i + 1, next.indent, childPath, comments)
      out[kv.key] = seq.value
      i = seq.next
      continue
    }
    if (next && !next.isItem && next.indent > keyCol) {
      const node = parseNode(lines, i + 1, keyCol, childPath, comments)
      out[kv.key] = node.value
      i = node.next
      continue
    }
    out[kv.key] = null
    i += 1
  }
  return { value: out, next: i }
}

function parseSeq(
  lines: readonly Line[],
  start: number,
  dashCol: number,
  path: string,
  comments: Map<string, Comments>,
): { value: YamlValue[]; next: number } {
  const out: YamlValue[] = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (!line.isItem || line.indent !== dashCol) break
    const itemPath = `${path}/${out.length}`
    comments.set(itemPath, { head: line.head, inline: line.inline })

    if (line.block) {
      out.push(blockToText(line.block))
      i += 1
      continue
    }
    if (line.text === '') {
      const next = lines[i + 1]
      if (next && next.indent > dashCol) {
        const node = parseNode(lines, i + 1, dashCol, itemPath, comments)
        out.push(node.value)
        i = node.next
      } else {
        out.push(null)
        i += 1
      }
      continue
    }
    if (isFlowStart(line.text)) {
      out.push(parseFlow(line.text, line.line))
      i += 1
      continue
    }
    if (splitMapping(line.text, line.line)) {
      const map = parseMap(lines, i, line.col, itemPath, comments)
      out.push(map.value)
      i = map.next
      continue
    }
    let text = line.text
    let j = i + 1
    while (j < lines.length) {
      const next = lines[j]
      if (next.indent <= dashCol || next.isItem || next.block || isFlowStart(next.text)) break
      if (splitMapping(next.text, next.line)) break
      text += ` ${next.text}`
      j += 1
    }
    out.push(resolveScalar(text, line.line))
    i = j
  }
  return { value: out, next: i }
}

export function parseYaml(src: string): Parsed {
  const { lines, preamble, tail } = scanLines(src)
  if (lines.length === 0) {
    return { value: null, comments: new Map(), preamble, tail, empty: true }
  }
  const comments = new Map<string, Comments>()
  const first = lines[0]
  const result = first.isItem
    ? parseSeq(lines, 0, first.indent, '', comments)
    : isFlowStart(first.text)
      ? ({ value: parseFlow(first.text, first.line), next: 1 } as {
          value: YamlValue
          next: number
        })
      : splitMapping(first.text, first.line)
        ? parseMap(lines, 0, first.col, '', comments)
        : parsePlainMulti(lines, 0, first.indent)
  if (result.next < lines.length) {
    const leftover = lines[result.next]
    fail(leftover.line, leftover.col + 1, '该行无法归入上层结构，请检查缩进')
  }
  return { value: result.value, comments, preamble, tail, empty: false }
}

// ---------------------------------------------------------------------------
// 输出：重新排版 YAML 并回填注释
// ---------------------------------------------------------------------------

/**
 * 只在「不加引号就会被当成别的语法」时才加引号。
 * 刻意放宽了 `:` `,` 这类只在特定上下文才有歧义的字符，避免把 `nginx:1.25`
 * 变成 `"nginx:1.25"`，让格式化结果更接近手写习惯。
 */
function needsQuote(text: string): boolean {
  if (text === '') return true
  if (/^\s|\s$/.test(text)) return true
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(text)) return true
  if (toNumber(text) !== null) return true
  if (/^[|>?*&!%@`"'\\[\]{}#-]/.test(text)) return true
  if (text.startsWith('- ')) return true
  if (/:[ \t]/.test(text) || text.endsWith(':')) return true
  if (/[ \t]#/.test(text)) return true
  return text.includes('\n') || text.includes('\t')
}

function scalarText(value: null | boolean | number | string): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  // JSON 的双引号转义是 YAML 双引号标量的子集，可直接复用
  return needsQuote(value) ? JSON.stringify(value) : value
}

function keyText(key: string): string {
  return needsQuote(key) ? JSON.stringify(key) : key
}

function inlineText(value: YamlValue): string {
  if (value === null || typeof value !== 'object') return scalarText(value)
  return Array.isArray(value) ? '[]' : '{}'
}

/** 只有非空集合才值得展开成块，否则内联成 `[]` / `{}` 更紧凑 */
function isBlockWorthy(value: YamlValue): boolean {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.length > 0
  return Object.keys(value).length > 0
}

function emitLines(
  value: YamlValue,
  level: number,
  size: number,
  sortKeys: boolean,
  path: string,
  comments: ReadonlyMap<string, Comments>,
): string[] {
  const pad = ' '.repeat(level * size)
  if (value === null || typeof value !== 'object') return [pad + scalarText(value)]

  if (Array.isArray(value)) {
    if (value.length === 0) return [pad + '[]']
    const out: string[] = []
    value.forEach((item, index) => {
      const itemPath = `${path}/${index}`
      const note = comments.get(itemPath)
      for (const text of note?.head ?? []) out.push(pad + text)
      const lines = emitLines(item, level + 1, size, sortKeys, itemPath, comments)
      const head = lines[0].slice((level + 1) * size)
      out.push(pad + '- ' + head + (note?.inline ? ` ${note.inline}` : ''))
      for (let k = 1; k < lines.length; k += 1) out.push(lines[k])
    })
    return out
  }

  const record = value as Record<string, YamlValue>
  const keys = sortKeys ? Object.keys(record).sort() : Object.keys(record)
  if (keys.length === 0) return [pad + '{}']
  const out: string[] = []
  for (const key of keys) {
    const child = record[key]
    const childPath = `${path}/${escapeSeg(key)}`
    const note = comments.get(childPath)
    for (const text of note?.head ?? []) out.push(pad + text)
    const label = keyText(key)
    if (isBlockWorthy(child)) {
      out.push(pad + label + ':' + (note?.inline ? ` ${note.inline}` : ''))
      out.push(...emitLines(child, level + 1, size, sortKeys, childPath, comments))
    } else {
      out.push(pad + label + ': ' + inlineText(child) + (note?.inline ? ` ${note.inline}` : ''))
    }
  }
  return out
}

export function stringifyYaml(
  value: YamlValue,
  size: number,
  sortKeys: boolean,
  parsed?: Parsed,
): string {
  const comments = parsed?.comments ?? new Map<string, Comments>()
  const body = parsed?.empty ? [] : emitLines(value, 0, size, sortKeys, '', comments)
  const head = parsed?.preamble ?? []
  const tail = parsed?.tail ?? []
  return [...head, ...body, ...tail].join('\n')
}

// ---------------------------------------------------------------------------
// 对外入口
// ---------------------------------------------------------------------------

/** JSON → YAML：JSON 的类型集合是 YAML 子集，可直接复用同一个 emitter */
export function toYaml(value: unknown, size: number): string {
  return stringifyYaml(value as YamlValue, size, false)
}

/**
 * YAML ⇄ JSON 互转。
 * 空输入返回空串（UI 需要区分「没输入」与「解析失败」）；
 * 语法不支持或 JSON 非法时抛中文错误，而不是输出半截结果。
 */
export function transform(input: YamlToJsonInput, options: YamlToJsonOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new YamlToJsonError('输入超过 1,000,000 字符上限')
  }
  const size = Number(options.indent)
  if (options.direction === 'yaml2json') {
    const parsed = parseYaml(input.text)
    return JSON.stringify(parsed.value, null, size)
  }
  let data: unknown
  try {
    data = JSON.parse(input.text)
  } catch {
    throw new YamlToJsonError('不是合法的 JSON，无法转换为 YAML')
  }
  return toYaml(data, size)
}
