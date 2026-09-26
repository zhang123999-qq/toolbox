import type { AstViewerInput, AstViewerOptions } from './schema'

// ---------------------------------------------------------------------------
// 轻量 JS 词法 / 语法分析（不追求完整 ECMAScript，只覆盖常见语句结构与括号嵌套）
// ---------------------------------------------------------------------------

interface Token {
  readonly type: 'kw' | 'id' | 'num' | 'str' | 'pun' | 'eof'
  readonly value: string
}

const EOF: Token = { type: 'eof', value: '' }

/** 关键字表（用于区分标识符与关键字） */
const KEYWORDS = new Set([
  'function',
  'class',
  'extends',
  'static',
  'const',
  'let',
  'var',
  'if',
  'else',
  'for',
  'while',
  'do',
  'return',
  'import',
  'export',
  'from',
  'default',
  'new',
  'switch',
  'case',
  'break',
  'continue',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'in',
  'of',
  'this',
  'super',
  'async',
  'await',
  'yield',
])

/** 词法分析：切分 token，跳过空白与注释 */
export function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  const n = src.length
  let i = 0
  while (i < n) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    // 行注释
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    // 块注释
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }
    // 字符串 / 模板串
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < n && src[j] !== c) {
        if (src[j] === '\\') j++
        j++
      }
      tokens.push({ type: 'str', value: src.slice(i, j + 1) })
      i = j + 1
      continue
    }
    // 数字
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < n && /[0-9a-zA-Z_.]/.test(src[j])) j++
      tokens.push({ type: 'num', value: src.slice(i, j) })
      i = j
      continue
    }
    // 标识符 / 关键字
    if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++
      const word = src.slice(i, j)
      tokens.push({ type: KEYWORDS.has(word) ? 'kw' : 'id', value: word })
      i = j
      continue
    }
    // 双字符标点
    const two = src.slice(i, i + 2)
    if (['=>', '===', '!==', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '...'].includes(two)) {
      tokens.push({ type: 'pun', value: two })
      i += 2
      continue
    }
    tokens.push({ type: 'pun', value: c })
    i++
  }
  return tokens
}

interface Node {
  readonly kind: string
  readonly detail: string
  readonly children: Node[]
}

class Parser {
  private readonly ts: Token[]
  private p = 0

  constructor(tokens: Token[]) {
    this.ts = tokens
  }

  private peek(): Token {
    return this.ts[this.p] ?? EOF
  }

  private next(): Token {
    return this.ts[this.p++] ?? EOF
  }

  private expect(v: string): void {
    const t = this.next()
    if (t.value !== v) throw new Error('语法错误：期望 "' + v + '"，实际 "' + t.value + '"')
  }

  /** 消费一对 ( ... )，返回内部 token 拼出的细节文本 */
  private collectParens(): string {
    this.expect('(')
    let depth = 1
    const parts: string[] = []
    while (depth > 0) {
      const t = this.next()
      if (t.type === 'eof') throw new Error('语法错误：括号未闭合')
      if (t.value === '(') depth++
      else if (t.value === ')') depth--
      if (depth > 0) parts.push(t.value)
    }
    return parts.join(' ')
  }

  /** 按括号深度收集到指定终止符（不消费终止符）；遇块结束符 } ) 也停下，避免吞掉外层括号 */
  private collectUntil(term: string): string {
    const parts: string[] = []
    let depth = 0
    for (;;) {
      const t = this.peek()
      if (t.type === 'eof') break
      if (depth === 0 && (t.value === term || t.value === '}' || t.value === ')')) break
      if (t.value === '(' || t.value === '[' || t.value === '{') depth++
      if (t.value === ')' || t.value === ']' || t.value === '}') depth--
      parts.push(this.next().value)
    }
    return parts.join(' ').trim()
  }

  private eatSemi(): void {
    if (this.peek().value === ';') this.next()
  }

  /** 解析一个函数/控制体的 body：{ ... } 或单条语句 */
  private parseBodyNode(): Node | null {
    if (this.peek().value === '{') {
      this.next()
      const children = this.parseBlock('}')
      this.expect('}')
      return { kind: 'Block', detail: '', children }
    }
    return this.parseStmt()
  }

  private parseFunction(): Node {
    this.next() // function
    let name = ''
    if (this.peek().type === 'id') name = this.next().value
    const params = this.collectParens()
    const body = this.parseBodyNode()
    return {
      kind: 'FunctionDecl',
      detail: name + '(' + params + ')',
      children: body ? [body] : [],
    }
  }

  private parseClass(): Node {
    this.next() // class
    let name = ''
    if (this.peek().type === 'id') name = this.next().value
    let ext = ''
    if (this.peek().value === 'extends') {
      this.next()
      ext = this.next().value
    }
    this.expect('{')
    const children: Node[] = []
    while (this.peek().value !== '}' && this.peek().type !== 'eof') {
      if (this.peek().value === 'static') this.next()
      const t = this.peek()
      if (t.type === 'id' || t.type === 'kw') {
        const mname = this.next().value
        if (this.peek().value === '(') {
          const params = this.collectParens()
          const body = this.parseBodyNode()
          children.push({
            kind: 'Method',
            detail: mname + '(' + params + ')',
            children: body ? [body] : [],
          })
        } else {
          children.push({ kind: 'Field', detail: mname, children: [] })
          this.collectUntil(';')
          this.eatSemi()
        }
      } else {
        this.next()
      }
    }
    this.expect('}')
    return {
      kind: 'ClassDecl',
      detail: ext ? name + ' extends ' + ext : name,
      children,
    }
  }

  private parseVar(): Node {
    const kw = this.next().value
    const detail = this.collectUntil(';')
    this.eatSemi()
    const kind = kw === 'const' ? 'ConstDecl' : kw === 'let' ? 'LetDecl' : 'VarDecl'
    return { kind, detail, children: [] }
  }

  private parseIf(): Node {
    this.next() // if
    const cond = this.collectParens()
    const body = this.parseBodyNode()
    const children: Node[] = body ? [body] : []
    if (this.peek().value === 'else') {
      this.next()
      if (this.peek().value === 'if') {
        children.push(this.parseIf())
      } else {
        const alt = this.parseBodyNode()
        if (alt) children.push({ kind: 'ElseBlock', detail: '', children: [alt] })
      }
    }
    return { kind: 'IfStmt', detail: cond, children }
  }

  private parseLoop(kw: 'for' | 'while'): Node {
    this.next()
    const cond = this.collectParens()
    const body = this.parseBodyNode()
    return {
      kind: kw === 'for' ? 'ForStmt' : 'WhileStmt',
      detail: cond,
      children: body ? [body] : [],
    }
  }

  private parseStmt(): Node | null {
    const t = this.peek()
    if (t.type === 'pun') {
      if (t.value === ';') {
        this.next()
        return null
      }
      if (t.value === '{') {
        this.next()
        const children = this.parseBlock('}')
        this.expect('}')
        return { kind: 'Block', detail: '', children }
      }
    }
    if (t.type === 'kw') {
      switch (t.value) {
        case 'function':
          return this.parseFunction()
        case 'class':
          return this.parseClass()
        case 'const':
        case 'let':
        case 'var':
          return this.parseVar()
        case 'if':
          return this.parseIf()
        case 'for':
          return this.parseLoop('for')
        case 'while':
          return this.parseLoop('while')
        case 'return': {
          this.next()
          const detail = this.collectUntil(';')
          this.eatSemi()
          return { kind: 'ReturnStmt', detail, children: [] }
        }
        case 'import': {
          this.next()
          const detail = this.collectUntil(';')
          this.eatSemi()
          return { kind: 'ImportDecl', detail, children: [] }
        }
        case 'export': {
          this.next()
          const detail = this.collectUntil(';')
          this.eatSemi()
          return { kind: 'ExportDecl', detail, children: [] }
        }
        case 'break':
        case 'continue': {
          this.next()
          this.eatSemi()
          return {
            kind: t.value === 'break' ? 'BreakStmt' : 'ContinueStmt',
            detail: '',
            children: [],
          }
        }
        default:
          break
      }
    }
    // 表达式语句
    const detail = this.collectUntil(';')
    this.eatSemi()
    return { kind: 'ExpressionStmt', detail, children: [] }
  }

  private parseBlock(close: string | undefined): Node[] {
    const stmts: Node[] = []
    for (;;) {
      const t = this.peek()
      if (t.type === 'eof') break
      if (close && t.value === close) break
      const s = this.parseStmt()
      if (s) stmts.push(s)
    }
    return stmts
  }

  parseProgram(): Node {
    return { kind: 'Program', detail: '', children: this.parseBlock(undefined) }
  }
}

/** 把 AST 渲染成缩进文本树 */
export function render(node: Node, depth = 0): string {
  const label = node.detail ? node.kind + ' ' + node.detail : node.kind
  const lines = ['  '.repeat(depth) + label]
  for (const c of node.children) lines.push(render(c, depth + 1))
  return lines.join('\n')
}

/** 主转换：空输入返回空串；解析失败抛中文错误 */
export function transform(input: AstViewerInput, _options: AstViewerOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const tokens = tokenize(input.text)
  const program = new Parser(tokens).parseProgram()
  return render(program)
}
