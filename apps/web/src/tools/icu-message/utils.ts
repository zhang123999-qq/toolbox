/**
 * icu-message（#728）纯函数：ICU MessageFormat 简易解析与预览。
 *
 * 手写递归下降解析器，覆盖子集：text / 简单参数 / number,date,time（含样式）/
 * plural / selectordinal（含 offset 与 =N 精确分支）/ select，支持嵌套与 # 占位。
 * 参数名允许除空白 ,{}'" 外的任意字符；语法错误抛带位置的中文错。
 * plural 按中文规则渲染：优先 =N 精确匹配，否则取 other 分支。
 */

export interface IcuCase {
  readonly selector: string
  readonly nodes: IcuNode[]
}

export type IcuNode =
  | { kind: 'text'; value: string }
  | { kind: 'argument'; name: string }
  | { kind: 'number'; name: string; style: string }
  | { kind: 'date'; name: string; style: string }
  | { kind: 'time'; name: string; style: string }
  | { kind: 'plural'; name: string; offset: number; cases: IcuCase[] }
  | { kind: 'selectordinal'; name: string; offset: number; cases: IcuCase[] }
  | { kind: 'select'; name: string; cases: IcuCase[] }

type PluralKind = 'plural' | 'selectordinal'

const SIMPLE_TYPES = new Set(['number', 'date', 'time'])

class IcuParser {
  private pos = 0
  constructor(private readonly input: string) {}

  private err(message: string): Error {
    return new Error(`第 ${this.pos + 1} 个字符处：${message}`)
  }

  private skipWs(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) this.pos += 1
  }

  private expect(ch: string): void {
    if (this.input[this.pos] !== ch) throw this.err(`缺少「${ch}」`)
    this.pos += 1
  }

  /** 参数名：除空白与 ,{}'" 外的连续字符 */
  private parseName(): string {
    const m = /^[^\s,{}'"]+/.exec(this.input.slice(this.pos))
    if (!m) throw this.err('缺少参数名')
    this.pos += m[0].length
    return m[0]
  }

  /** 引号转义：'' → ' ；'{ / '} / '#（可配对闭引号）→ 字面字符；其余 ' 保持原样 */
  private parseQuote(): string {
    const next = this.input[this.pos + 1]
    if (next === "'") {
      this.pos += 2
      return "'"
    }
    if (next === '{' || next === '}' || next === '#') {
      if (this.input[this.pos + 2] === "'") {
        this.pos += 3
        return next
      }
      this.pos += 2
      return next
    }
    this.pos += 1
    return "'"
  }

  parseMessage(endChar: '}' | null): IcuNode[] {
    const nodes: IcuNode[] = []
    let text = ''
    const flush = (): void => {
      if (text !== '') {
        nodes.push({ kind: 'text', value: text })
        text = ''
      }
    }
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]
      if (endChar !== null && ch === '}') {
        this.pos += 1
        flush()
        return nodes
      }
      if (ch === '{') {
        flush()
        nodes.push(this.parseArgument())
        continue
      }
      if (ch === '}') throw this.err('多余的右花括号「}」')
      if (ch === "'") {
        text += this.parseQuote()
        continue
      }
      text += ch
      this.pos += 1
    }
    if (endChar !== null) throw this.err('花括号未闭合')
    flush()
    return nodes
  }

  private parseSelector(): string {
    const rest = this.input.slice(this.pos)
    const exact = /^=\d+(\.\d+)?/.exec(rest)
    if (exact) {
      this.pos += exact[0].length
      return exact[0]
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest)
    if (!ident) throw this.err('分支缺少选择器')
    this.pos += ident[0].length
    return ident[0]
  }

  private parseCases(name: string, kind: PluralKind | 'select'): IcuNode {
    let offset = 0
    this.skipWs()
    if (kind === 'plural' || kind === 'selectordinal') {
      const off = /^offset\s*:\s*(\d+)/.exec(this.input.slice(this.pos))
      if (off) {
        offset = Number(off[1])
        this.pos += off[0].length
        this.skipWs()
      }
    }
    const cases: IcuCase[] = []
    for (;;) {
      this.skipWs()
      const ch = this.input[this.pos]
      if (ch === '}') {
        this.pos += 1
        break
      }
      if (ch === undefined) throw this.err('分支花括号未闭合')
      const selector = this.parseSelector()
      this.skipWs()
      this.expect('{')
      cases.push({ selector, nodes: this.parseMessage('}') })
    }
    if (cases.length === 0) throw this.err('至少需要一个分支（如 other）')
    if (kind === 'select') return { kind: 'select', name, cases }
    return { kind, name, offset, cases }
  }

  private parseArgument(): IcuNode {
    this.pos += 1 // consume '{'
    this.skipWs()
    const name = this.parseName()
    this.skipWs()
    if (this.input[this.pos] === '}') {
      this.pos += 1
      return { kind: 'argument', name }
    }
    this.expect(',')
    this.skipWs()
    const type = this.parseName()
    this.skipWs()
    if (this.input[this.pos] === '}') {
      this.pos += 1
      if (SIMPLE_TYPES.has(type)) {
        return { kind: type as 'number' | 'date' | 'time', name, style: '' }
      }
      throw this.err(`「${type}」缺少样式体`)
    }
    this.expect(',')
    this.skipWs()
    if (type === 'plural' || type === 'selectordinal' || type === 'select') {
      return this.parseCases(name, type)
    }
    if (SIMPLE_TYPES.has(type)) {
      const start = this.pos
      const close = this.input.indexOf('}', start)
      if (close === -1) throw this.err('花括号未闭合')
      const style = this.input.slice(start, close).trim()
      this.pos = close + 1
      return { kind: type as 'number' | 'date' | 'time', name, style }
    }
    throw this.err(`不支持的参数类型「${type}」`)
  }

  parse(): IcuNode[] {
    return this.parseMessage(null)
  }
}

/**
 * 解析 ICU 消息为 AST。空串得空数组；语法错误抛带位置的中文错。
 */
export function parseIcu(input: string): IcuNode[] {
  return new IcuParser(input).parse()
}

interface PluralCtx {
  readonly value: number
  readonly offset: number
}

function renderNodes(
  nodes: readonly IcuNode[],
  values: Readonly<Record<string, string | number>>,
  pctx: PluralCtx | null,
): string {
  let out = ''
  for (const node of nodes) {
    switch (node.kind) {
      case 'text': {
        out += pctx ? node.value.replace(/#/g, String(pctx.value - pctx.offset)) : node.value
        break
      }
      case 'argument': {
        const v = values[node.name]
        out += v === undefined ? `{${node.name}}` : String(v)
        break
      }
      case 'number': {
        const v = values[node.name]
        if (v === undefined) {
          out += `{${node.name}}`
        } else {
          const num = Number(v)
          out += Number.isNaN(num) ? String(v) : new Intl.NumberFormat('zh-CN').format(num)
        }
        break
      }
      case 'date':
      case 'time': {
        const v = values[node.name]
        out += v === undefined ? `{${node.name}}` : String(v)
        break
      }
      case 'plural':
      case 'selectordinal':
      case 'select': {
        out += renderComplex(node, values, pctx)
        break
      }
    }
  }
  return out
}

function renderComplex(
  node: Extract<IcuNode, { kind: 'plural' | 'selectordinal' | 'select' }>,
  values: Readonly<Record<string, string | number>>,
  pctx: PluralCtx | null,
): string {
  const v = values[node.name]
  if (v === undefined) return `{${node.name}}`
  if (node.kind === 'select') {
    const key = String(v)
    const c =
      node.cases.find((x) => x.selector === key) ?? node.cases.find((x) => x.selector === 'other')
    return c ? renderNodes(c.nodes, values, pctx) : ''
  }
  const num = Number(v)
  const explicit = node.cases.find(
    (x) => x.selector.startsWith('=') && x.selector.slice(1) === String(num),
  )
  const c = explicit ?? node.cases.find((x) => x.selector === 'other')
  if (!c) return ''
  const next: PluralCtx = { value: num, offset: node.offset }
  return renderNodes(c.nodes, values, next)
}

/**
 * 渲染预览：按给定变量取值展开消息。
 * 缺失变量保留 {name} 占位；plural 按中文规则（=N 精确优先，否则 other）。
 */
export function previewIcu(
  message: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return renderNodes(parseIcu(message), values, null)
}

/**
 * 提取消息中所有占位变量名（去重，保持出现顺序，含嵌套）。
 */
export function extractPlaceholders(message: string): string[] {
  const seen: string[] = []
  const walk = (nodes: readonly IcuNode[]): void => {
    for (const n of nodes) {
      if (n.kind === 'text') continue
      if (!seen.includes(n.name)) seen.push(n.name)
      if (n.kind === 'plural' || n.kind === 'selectordinal' || n.kind === 'select') {
        for (const c of n.cases) walk(c.nodes)
      }
    }
  }
  walk(parseIcu(message))
  return seen
}
