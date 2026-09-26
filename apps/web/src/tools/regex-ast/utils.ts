import type { RegexAstInput, RegexAstOptions } from './schema'

// ---------------------------------------------------------------------------
// 正则语法树（自研递归下降解析：连接 / 选择 / 字面量 / 字符类 / 锚点 / 分组 / 量词）
// ---------------------------------------------------------------------------

type AstNode =
  | { t: 'empty' }
  | { t: 'literal'; value: string }
  | { t: 'class'; value: string }
  | { t: 'anchor'; value: string }
  | { t: 'group'; child: AstNode; capturing: boolean; name?: string }
  | { t: 'alt'; branches: AstNode[] }
  | { t: 'concat'; children: AstNode[] }
  | { t: 'quant'; child: AstNode; min: number; max: number | 'inf' }

class Parser {
  private readonly s: string
  private i = 0

  constructor(s: string) {
    this.s = s
  }

  private peek(): string | undefined {
    return this.s[this.i]
  }

  private next(): string | undefined {
    return this.s[this.i++]
  }

  parseTop(): AstNode {
    const root = this.parseAlt()
    if (this.i < this.s.length) {
      throw new Error('正则解析失败：意外字符 "' + this.peek() + '"')
    }
    return root
  }

  private parseAlt(): AstNode {
    const branches: AstNode[] = [this.parseSeq()]
    while (this.peek() === '|') {
      this.next()
      branches.push(this.parseSeq())
    }
    if (branches.length === 1) return branches[0]
    return { t: 'alt', branches }
  }

  private parseSeq(): AstNode {
    const out: AstNode[] = []
    while (this.i < this.s.length && this.peek() !== '|' && this.peek() !== ')') {
      let atom = this.parseBase()
      atom = this.parseQuant(atom)
      out.push(atom)
    }
    if (out.length === 0) return { t: 'empty' }
    if (out.length === 1) return out[0]
    return { t: 'concat', children: out }
  }

  private parseBase(): AstNode {
    const c = this.peek()
    if (c === undefined) return { t: 'empty' }
    if (c === '^' || c === '$') {
      this.next()
      return { t: 'anchor', value: c }
    }
    if (c === '(') {
      this.next()
      let capturing = true
      let name: string | undefined
      if (this.peek() === '?') {
        this.next()
        if (this.peek() === ':') {
          this.next()
          capturing = false
        } else if (this.peek() === '<') {
          this.next()
          const m = /^([A-Za-z_]\w*)/.exec(this.s.slice(this.i))
          if (!m) throw new Error('命名分组缺少名字')
          name = m[1]
          this.i += m[0].length
          if (this.peek() !== '>') throw new Error('命名分组缺少 >')
          this.next()
        } else {
          throw new Error('不支持的分组开头: ?' + this.peek())
        }
      }
      const child = this.parseAlt()
      if (this.next() !== ')') throw new Error('缺少右括号 )')
      return { t: 'group', child, capturing, name }
    }
    if (c === '[') {
      this.next()
      let cls = '['
      while (this.i < this.s.length && this.peek() !== ']') {
        if (this.peek() === '\\') cls += this.next() ?? ''
        cls += this.next() ?? ''
      }
      if (this.next() !== ']') throw new Error('缺少字符类右括号 ]')
      cls += ']'
      return { t: 'class', value: cls }
    }
    if (c === '\\') {
      this.next()
      const e = this.next()
      if (e === undefined) throw new Error('反斜杠后缺少字符')
      if ('dDwWsSbB'.includes(e)) return { t: 'class', value: '\\' + e }
      return { t: 'literal', value: '\\' + e }
    }
    this.next()
    return { t: 'literal', value: c }
  }

  private parseQuant(atom: AstNode): AstNode {
    const c = this.peek()
    if (c === '?' || c === '*' || c === '+') {
      this.next()
      const map: Record<string, [number, number | 'inf']> = {
        '?': [0, 1],
        '*': [0, 'inf'],
        '+': [1, 'inf'],
      }
      const [min, max] = map[c]
      return { t: 'quant', child: atom, min, max }
    }
    if (c === '{') {
      const m = /^\{(\d+)(?:(,)(\d*))?\}/.exec(this.s.slice(this.i))
      if (m) {
        this.i += m[0].length
        const min = parseInt(m[1], 10)
        const max: number | 'inf' = m[2] === ',' ? (m[3] ? parseInt(m[3], 10) : 'inf') : min
        return { t: 'quant', child: atom, min, max }
      }
    }
    return atom
  }
}

/** 把 AST 渲染成缩进文本树 */
export function renderAst(node: AstNode, depth = 0): string {
  const pad = '  '.repeat(depth)
  switch (node.t) {
    case 'empty':
      return pad + 'Epsilon'
    case 'literal':
      return pad + 'Literal "' + node.value + '"'
    case 'class':
      return pad + 'CharClass ' + node.value
    case 'anchor':
      return pad + 'Anchor ' + node.value
    case 'group': {
      const head = node.name
        ? 'Group (name=' + node.name + ')'
        : node.capturing
          ? 'Group'
          : 'Group (non-capturing)'
      return [pad + head, renderAst(node.child, depth + 1)].join('\n')
    }
    case 'alt': {
      const lines = [pad + 'Alternation']
      for (const b of node.branches) lines.push(renderAst(b, depth + 1))
      return lines.join('\n')
    }
    case 'concat': {
      const lines = [pad + 'Concatenation']
      for (const c of node.children) lines.push(renderAst(c, depth + 1))
      return lines.join('\n')
    }
    case 'quant': {
      const range =
        node.max === 'inf'
          ? node.min === 0
            ? '{0,∞}'
            : '{' + node.min + ',∞}'
          : node.min === node.max
            ? '{' + node.min + '}'
            : '{' + node.min + ',' + node.max + '}'
      return [pad + 'Quantifier ' + range, renderAst(node.child, depth + 1)].join('\n')
    }
  }
}

/** 主转换：空输入返回空串；非法正则抛中文错误 */
export function transform(input: RegexAstInput, _options: RegexAstOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  try {
    const root = new Parser(input.text).parseTop()
    return 'Regex\n' + renderAst(root, 1)
  } catch (error) {
    if (error instanceof Error && /^正则解析失败|缺少|不支持|命名/.test(error.message)) throw error
    throw new Error('正则解析失败：' + (error instanceof Error ? error.message : String(error)), {
      cause: error,
    })
  }
}
