import type { BigJsonInput, BigJsonOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class BigJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BigJsonError'
  }
}

/** 单次处理上限：超过则拒绝，GRAPHICS_WORKER 再快也顶不住几百 MB 的粘贴 */
export const MAX_INPUT = 8_000_000

/** 分块大小：每读这么多字符回到外层循环一次，便于中途因错误停下 */
const CHUNK = 65_536

/** 报错 / 路径预览里的行截断长度 */
const PREVIEW = 80

/** 严格的数字语法 */
const NUMBER_RE = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/

/** 数字 token 允许继续的字符 */
const NUMBER_CHAR = /[-+0-9.eEA-Za-z]/

/** 字面量 token 允许继续的字符 */
const LITERAL_CHAR = /[a-z]/

/** JSON 空白 */
const WS = new Set([' ', '\t', '\n', '\r'])

/** JSON 简单转义，用于还原键名中的 \n 之类 */
const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  '/': '/',
  '\\': '\\',
  '"': '"',
}

/**
 * 容器栈的一帧，记录当前处于哪个容器、以及「下一步该读到什么」。
 * phase 是唯一的流转状态，比一堆布尔互斥标志更不容易漏判。
 */
interface Frame {
  readonly type: 'object' | 'array'
  /** 该容器自身的路径，用于拼子节点的路径 */
  readonly path: string
  /** 已收录的成员数 */
  count: number
  /** 数组专用：下一个元素的下标 */
  index: number
  phase: 'expectKey' | 'expectColon' | 'expectValue' | 'expectSeparator' | 'afterComma'
}

interface Counts {
  objects: number
  arrays: number
  keys: number
  strings: number
  numbers: number
  booleans: number
  nulls: number
  maxDepth: number
  chars: number
  lines: number
}

interface Issue {
  readonly pos: number
  readonly message: string
}

interface ScanResult {
  readonly counts: Counts
  readonly paths: ReadonlyMap<string, number>
  /** 取样满额之后又出现过多少次「没见过的路径」（无法判定是否互不相同） */
  readonly overflow: number
  readonly issue: Issue | null
}

/** 行数：与常见编辑器一致，末尾无内容的换行不计 */
function countLines(text: string): number {
  return text === '' ? 0 : text.split(/\r\n|\n|\r/).length
}

/** 字符下标换算成行列号 */
function lineCol(text: string, pos: number): { line: number; col: number } {
  let line = 1
  let lineStart = 0
  for (let p = 0; p < pos && p < text.length; p += 1) {
    if (text.charCodeAt(p) === 10) {
      line += 1
      lineStart = p + 1
    }
  }
  return { line, col: pos - lineStart + 1 }
}

/** 取所在行的原文，用于把错误「指」在实际出错的那一行上 */
function lineAt(text: string, pos: number): string {
  const start = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1
  let end = text.indexOf('\n', pos)
  if (end === -1) end = text.length
  const raw = text.slice(start, end).trim()
  return raw.length <= PREVIEW ? raw : `${raw.slice(0, PREVIEW - 1)}…`
}

/** 键名的最小转义还原：只处理常见转义，其余保持原样（取样用途足够） */
function unescapeKey(raw: string): string {
  let out = ''
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    if (ch !== '\\' || i + 1 >= raw.length) {
      out += ch
      continue
    }
    const next = raw[i + 1]
    out += SIMPLE_ESCAPES[next] ?? `\\${next}`
    i += 1
  }
  return out
}

/** 扫描中尚未结算的字面量 token（数字 / true / false / null） */
interface PendingToken {
  kind: 'number' | 'literal'
  start: number
  buffer: string
}

/**
 * 单遍扫描：一边走字符一边统计，只保留「路径取样」这点 State。
 *
 * 浏览器里没有 Node 的 stream，也没有 streaming JSON parser 的依赖可用，
 * 因此不做全量物化（那是 #131/#134 的活），只回答大文件的三个问题：
 * 规模多大、有哪些键路径、语法错在哪。
 */
function scan(text: string, topN: number): ScanResult {
  const counts: Counts = {
    objects: 0,
    arrays: 0,
    keys: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    maxDepth: 0,
    chars: text.length,
    lines: countLines(text),
  }
  const paths = new Map<string, number>()
  let overflow = 0
  let issue: Issue | null = null
  const frames: Frame[] = []
  let rootDone = false
  let inString = false
  let escape = false
  let readingKey = false
  let keyStart = -1
  let pendingKeyPath = ''
  let pendingValuePath = ''
  let token: PendingToken | null = null

  function fail(pos: number, message: string): void {
    // 只记录第一处：后面的错位基本都是它的连带结果
    if (!issue) issue = { pos, message }
  }

  function recordPath(path: string): void {
    if (paths.size < topN) {
      paths.set(path, (paths.get(path) ?? 0) + 1)
      return
    }
    if (!paths.has(path)) overflow += 1
  }

  /** 一个成员（标量或容器）读完：更新父容器的计数与相位 */
  function finishMember(): void {
    const top = frames[frames.length - 1]
    if (!top) {
      rootDone = true
      return
    }
    top.count += 1
    top.phase = 'expectSeparator'
  }

  /** 记录 pendingValuePath 这条路径（取样用途），做题一样放在成员完成时 */
  function settleToken(start: number, kind: 'number' | 'literal', buffer: string): void {
    if (kind === 'number') {
      if (!NUMBER_RE.test(buffer)) {
        fail(start, `非法数字 ${buffer}`)
        return
      }
      counts.numbers += 1
    } else if (buffer === 'true' || buffer === 'false') {
      counts.booleans += 1
    } else if (buffer === 'null') {
      counts.nulls += 1
    } else {
      fail(start, `未知的标识符 ${buffer}（只支持 true / false / null）`)
      return
    }
    recordPath(pendingValuePath)
    finishMember()
  }

  /** 值开始前的位置校验；顺带算出这次值的路径 */
  function beginValue(pos: number): boolean {
    if (rootDone) {
      fail(pos, '顶层值之后还有多余内容')
      return false
    }
    const top = frames[frames.length - 1]
    if (!top) {
      pendingValuePath = '$'
      return true
    }
    if (top.type === 'object') {
      if (top.phase === 'expectKey') {
        fail(pos, '对象的键必须是双引号字符串')
        return false
      }
      if (top.phase === 'expectColon') {
        fail(pos, '键后面缺少冒号')
        return false
      }
      if (top.phase === 'expectSeparator') {
        fail(pos, '成员之间缺少逗号')
        return false
      }
      pendingValuePath = pendingKeyPath
      return true
    }
    if (top.phase === 'expectSeparator') {
      fail(pos, '成员之间缺少逗号')
      return false
    }
    const child = `${top.path}[${top.index}]`
    top.index += 1
    pendingValuePath = child
    return true
  }

  /** 处理一个结构字符（也包含值的起手字符）；返回 false 表示应立即停止扫描 */
  function applyStructure(pos: number, ch: string): boolean {
    const top = frames[frames.length - 1]
    if (ch === '{' || ch === '[') {
      if (!beginValue(pos)) return false
      const path = pendingValuePath
      recordPath(path)
      const frame: Frame = {
        type: ch === '{' ? 'object' : 'array',
        path,
        count: 0,
        index: 0,
        phase: ch === '{' ? 'expectKey' : 'expectValue',
      }
      frames.push(frame)
      if (ch === '{') counts.objects += 1
      else counts.arrays += 1
      counts.maxDepth = Math.max(counts.maxDepth, frames.length)
      return true
    }
    if (ch === '"') {
      if (top && top.type === 'object' && top.phase === 'expectKey') {
        top.phase = 'expectColon'
        readingKey = true
        keyStart = pos
        inString = true
        return true
      }
      if (!beginValue(pos)) return false
      counts.strings += 1
      inString = true
      return true
    }
    if (ch === ':') {
      if (!top || top.type !== 'object' || top.phase !== 'expectColon') {
        fail(pos, '冒号只能出现在对象的键之后')
        return false
      }
      top.phase = 'expectValue'
      return true
    }
    if (ch === ',') {
      if (!top) {
        fail(pos, '逗号只能出现在对象或数组内部')
        return false
      }
      if (top.phase !== 'expectSeparator') {
        fail(pos, top.phase === 'afterComma' ? '出现了连续的逗号' : '此处缺少成员')
        return false
      }
      top.phase = top.type === 'object' ? 'expectKey' : 'afterComma'
      return true
    }
    if (ch === '}' || ch === ']') {
      const expected = ch === '}' ? 'object' : 'array'
      const opener = ch === '}' ? '{' : '['
      if (!top || top.type !== expected) {
        fail(pos, `多余的 ${ch}，没有与之对应的 ${opener}`)
        return false
      }
      if (top.phase === 'expectColon') {
        fail(pos, '键后面缺少值')
        return false
      }
      // 对象在「冒号后等价值」时收尾才是缺值；数组停在 expectValue 只可能是空数组 []
      if (top.phase === 'expectValue' && top.type === 'object') {
        fail(pos, '冒号后面缺少值')
        return false
      }
      if (top.phase === 'afterComma' || (top.phase === 'expectKey' && top.count > 0)) {
        fail(pos, '出现了多余的逗号（不允许尾随逗号）')
        return false
      }
      frames.pop()
      finishMember()
      return true
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      if (!beginValue(pos)) return false
      token = { kind: 'number', start: pos, buffer: ch }
      return true
    }
    if (ch >= 'a' && ch <= 'z') {
      if (!beginValue(pos)) return false
      token = { kind: 'literal', start: pos, buffer: ch }
      return true
    }
    fail(pos, `意外的字符 "${ch}"`)
    return false
  }

  outer: for (let start = 0; start < text.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, text.length)
    for (let i = start; i < end; i += 1) {
      const ch = text[i]
      const code = text.charCodeAt(i)
      if (inString) {
        if (escape) {
          escape = false
          continue
        }
        if (ch === '\\') {
          escape = true
          continue
        }
        if (ch === '"') {
          inString = false
          if (readingKey) {
            readingKey = false
            counts.keys += 1
            const top = frames[frames.length - 1]
            pendingKeyPath = `${top ? top.path : '$'}.${unescapeKey(text.slice(keyStart + 1, i))}`
          } else {
            recordPath(pendingValuePath)
            finishMember()
          }
          continue
        }
        if (code < 0x20) fail(i, '字符串里出现了不能直接书写的控制字符')
        continue
      }
      if (token !== null) {
        // 取到具名类型的局部常量上，避免 token 在闭包里被重新赋值导致跨闭包收窄成 never
        const current: PendingToken = token
        const continues = current.kind === 'number' ? NUMBER_CHAR.test(ch) : LITERAL_CHAR.test(ch)
        if (continues) {
          current.buffer += ch
          continue
        }
        token = null
        settleToken(current.start, current.kind, current.buffer)
        if (issue) break outer
      }
      if (WS.has(ch)) continue
      if (!applyStructure(i, ch)) break outer
    }
    if (issue) break
  }

  // 收尾：一个 token 停在文末（如 「123」）也要结算，且容器必须全部闭合
  if (!issue && token !== null) {
    const last: PendingToken = token
    settleToken(last.start, last.kind, last.buffer)
  }
  if (!issue && frames.length > 0) {
    const top = frames[frames.length - 1]
    const opener = top.type === 'object' ? '{' : '['
    issue = { pos: text.length, message: `结构没有闭合，缺少与 ${opener} 配对的结束符` }
  }

  return { counts, paths, overflow, issue }
}

/** 统计模式输出 */
function renderStats(result: ScanResult, text: string): string {
  const c = result.counts
  const lines = [
    `字符数：${c.chars}`,
    `行数：${c.lines}`,
    `对象数：${c.objects}`,
    `数组数：${c.arrays}`,
    `键值对数：${c.keys}`,
    `字符串值：${c.strings}`,
    `数字值：${c.numbers}`,
    `布尔值：${c.booleans}`,
    `null 值：${c.nulls}`,
    `最大嵌套深度：${c.maxDepth}`,
    `结构闭合：${result.issue ? '否' : '是'}`,
  ]
  if (result.issue) {
    const { line, col } = lineCol(text, result.issue.pos)
    lines.push(`注意：第 ${line} 行第 ${col} 列起有语法问题，以上统计可能不完整`)
  }
  return lines.join('\n')
}

/** 路径抽样模式输出 */
function renderPaths(result: ScanResult, topN: number): string {
  const names = [...result.paths.keys()]
  if (names.length === 0) return '没有发现任何键路径（输入里可能只有标量）'
  const lines = [`键路径抽样（首次出现顺序，最多 ${topN} 条）`, ...names]
  if (result.overflow > 0) {
    lines.push(`另有 ${result.overflow} 次新路径未被收录（已达取样上限）`)
  }
  return lines.join('\n')
}

/** 错误定位模式输出 */
function renderError(result: ScanResult, text: string): string {
  if (!result.issue) {
    return `未发现语法错误（结构完全闭合，最深嵌套 ${result.counts.maxDepth} 层）`
  }
  const { line, col } = lineCol(text, result.issue.pos)
  return [
    `第 ${line} 行第 ${col} 列：${result.issue.message}`,
    `  行内容：${lineAt(text, result.issue.pos)}`,
  ].join('\n')
}

/**
 * 大 JSON 的单遍扫描 —— 纯函数，不依赖 React / DOM。
 *
 * 规划表原定走 Node 的 stream / streaming parser，浏览器环境两者都不可用，
 * 这是**受限实现**：只给规模、抽样路径与第一个语法错误的位置，
 * 不 parse 成对象树，也不提供取值 / 过滤。
 */
export function transform(input: BigJsonInput, options: BigJsonOptions): string {
  if (!input.text.trim()) return ''

  if (input.text.length > MAX_INPUT) {
    throw new BigJsonError(`输入超过 ${MAX_INPUT} 字符上限`)
  }

  const topN = Number(options.topN)
  const result = scan(input.text, topN)
  if (options.mode === 'stats') return renderStats(result, input.text)
  if (options.mode === 'paths') return renderPaths(result, topN)
  return renderError(result, input.text)
}
