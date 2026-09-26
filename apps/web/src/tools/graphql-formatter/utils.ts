import type { GraphqlFormatterInput, GraphqlFormatterOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class GraphqlFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphqlFormatError'
  }
}

const MAX_INPUT = 500_000

type TokenKind = 'name' | 'number' | 'punct' | 'string' | 'comment'
interface Token {
  readonly kind: TokenKind
  readonly value: string
}

/** 词法切分：识别三引号块字符串、普通字符串、注释、标点与名字 / 数字；逗号与空白丢弃 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const pushName = (text: string, kind: TokenKind = 'name'): void => {
    if (text !== '') tokens.push({ kind, value: text })
  }
  while (i < input.length) {
    const char = input[i]
    if (/\s/.test(char)) {
      i += 1
      continue
    }
    // 注释
    if (char === '#') {
      let end = i + 1
      while (end < input.length && input[end] !== '\n') end += 1
      tokens.push({ kind: 'comment', value: input.slice(i, end).trimEnd() })
      i = end
      continue
    }
    // 三引号块字符串
    if (input.startsWith('"""', i)) {
      let end = i + 3
      while (end < input.length && !input.startsWith('"""', end)) end += 1
      if (end >= input.length) throw new GraphqlFormatError('块字符串缺少结束的三引号 """')
      end += 3
      tokens.push({ kind: 'string', value: input.slice(i, end) })
      i = end
      continue
    }
    // 普通字符串
    if (char === '"') {
      let end = i + 1
      while (end < input.length) {
        if (input[end] === '\\') {
          end += 2
          continue
        }
        if (input[end] === '"') {
          end += 1
          break
        }
        end += 1
      }
      if (end > input.length || input[end - 1] !== '"') {
        throw new GraphqlFormatError('字符串缺少结束引号')
      }
      tokens.push({ kind: 'string', value: input.slice(i, end) })
      i = end
      continue
    }
    // 标点（含多字符 ...）
    if (input.startsWith('...', i)) {
      tokens.push({ kind: 'punct', value: '...' })
      i += 3
      continue
    }
    if ('{}()[]:=|&!@$,'.includes(char)) {
      tokens.push({ kind: 'punct', value: char })
      i += 1
      continue
    }
    // 名字 / 数字：读到空白或标点为止
    let end = i
    while (end < input.length && !/[\s,{}()[\]:=|&!@$"#]/.test(input[end])) end += 1
    const word = input.slice(i, end)
    pushName(word, /^-?\d/.test(word) ? 'number' : 'name')
    i = end
  }
  return tokens
}

/** 这些关键字后的名字属于同一行头部（query Foo / type Bar / ... on Baz） */
const HEADER_WORDS = new Set([
  'query',
  'mutation',
  'subscription',
  'type',
  'input',
  'enum',
  'interface',
  'union',
  'scalar',
  'schema',
  'extend',
  'fragment',
  'on',
  'directive',
])

const OPEN = '{(['
const CLOSE = '})]'

/**
 * 基于 token 流的 GraphQL 美化：
 * - 选择集 / 类型体 `{ ... }` 换行缩进
 * - 参数 `(...)`、列表 `[...]`、输入对象在参数内保持单行
 */
export function formatTokens(tokens: readonly Token[], unit: string): string {
  const lines: string[] = []
  let line = ''
  let indent = 0
  /** 选择集括号栈：记录每个 `{` 是 block 还是 inline 输入对象 */
  const braceStack: Array<'block' | 'inline'> = []
  let argDepth = 0 // ( 与 [ 的嵌套层级；>0 时不换行
  /** 下一个词元是否紧贴（不自动加前导空格），用于 $var / @dir / (x / String! 等 */
  let nextNoSpace = false

  const newline = (): void => {
    lines.push(line.trimEnd())
    line = ''
    nextNoSpace = false
  }
  const atLineStart = (): boolean => line.trim() === ''
  const appendWord = (text: string, forceLead?: string): void => {
    if (atLineStart()) {
      line = unit.repeat(indent) + text
    } else {
      const lead = forceLead ?? (nextNoSpace ? '' : ' ')
      line += lead + text
    }
    nextNoSpace = false
  }

  let prev: Token | null = null
  for (const token of tokens) {
    const { kind, value } = token

    if (kind === 'comment') {
      if (!atLineStart()) newline()
      line = unit.repeat(indent) + value
      newline()
      prev = token
      continue
    }

    // 在选择集层级，一个字段结束后另起一行（参数内不换行）
    if (
      argDepth === 0 &&
      braceStack[braceStack.length - 1] === 'block' &&
      !atLineStart() &&
      (kind === 'name' || value === '...')
    ) {
      const prevIsEndedField =
        prev?.value === '}' ||
        prev?.value === ')' ||
        prev?.value === '!' ||
        (prev?.kind === 'name' && !HEADER_WORDS.has(prev.value))
      if (prevIsEndedField && !(value === 'on' && prev?.value === '...')) {
        newline()
      }
    }

    if (value === '{') {
      if (argDepth > 0) {
        braceStack.push('inline')
        appendWord('{', nextNoSpace ? '' : '')
        nextNoSpace = false
      } else {
        braceStack.push('block')
        appendWord('{', ' ')
        newline()
        indent += 1
      }
    } else if (value === '}') {
      const type = braceStack.pop()
      if (type === 'block') {
        indent = Math.max(0, indent - 1)
        if (!atLineStart()) newline()
        line = unit.repeat(indent) + '}'
        nextNoSpace = false
        // 顶层定义结束后换行，让下一个 query / type / enum 另起一行
        if (indent === 0) newline()
      } else {
        line += '}'
        nextNoSpace = false
      }
    } else if (value === '(' || value === '[') {
      // '(' 永远紧贴前面的字段名 / 别名（user( / GetUser(）；'[' 遵循粘附状态
      if (value === '(') {
        if (atLineStart()) line = unit.repeat(indent)
        line += '('
      } else {
        if (atLineStart()) line = unit.repeat(indent)
        else if (!nextNoSpace) line += ' '
        line += '['
      }
      argDepth += 1
      nextNoSpace = true
    } else if (value === ')' || value === ']') {
      argDepth = Math.max(0, argDepth - 1)
      line += value
      nextNoSpace = false
    } else if (value === ',') {
      // 参数 / 变量列表里逗号作分隔；选择集里的逗号忽略且不影响字段换行判断
      if (argDepth > 0) {
        line += ','
        nextNoSpace = false
      } else {
        continue
      }
    } else if (value === ':') {
      line += ':'
      nextNoSpace = false // 冒号后空一格
    } else if (value === '!') {
      line += '!'
      nextNoSpace = true
    } else if (value === '$') {
      if (atLineStart()) line = unit.repeat(indent)
      else if (!nextNoSpace) line += ' '
      line += '$'
      nextNoSpace = true
    } else if (value === '@') {
      if (atLineStart()) line = unit.repeat(indent)
      else line += ' '
      line += '@'
      nextNoSpace = true
    } else if (value === '=' || value === '|' || value === '&') {
      line += ` ${value} `
      nextNoSpace = true // 行尾已带空格，词元不再自动补
    } else if (value === '...') {
      if (atLineStart()) line = unit.repeat(indent)
      line += '...'
      nextNoSpace = true
    } else {
      // `... on` 需要空格，而 `...Fragment` 紧贴
      const forceLead = value === 'on' && prev?.value === '...' ? ' ' : undefined
      appendWord(value, forceLead)
    }

    prev = token
  }
  if (!atLineStart()) newline()
  return lines.join('\n')
}

/**
 * GraphQL 美化。
 * 空输入返回空串；括号不匹配 / 字符串未闭合抛 GraphqlFormatError。
 */
export function transform(input: GraphqlFormatterInput, options: GraphqlFormatterOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) throw new GraphqlFormatError('输入超过 500,000 字符上限')

  const tokens = tokenize(input.text)
  const result = formatTokens(tokens, options.indent === '4' ? '    ' : '  ')

  // 结构性校验：括号配平
  const stack: string[] = []
  for (const token of tokens) {
    if (token.kind !== 'punct') continue
    const openIndex = OPEN.indexOf(token.value)
    if (openIndex !== -1) stack.push(CLOSE[openIndex])
    else if (CLOSE.includes(token.value)) {
      if (stack.pop() !== token.value) {
        throw new GraphqlFormatError('括号不匹配，无法格式化')
      }
    }
  }
  if (stack.length > 0) throw new GraphqlFormatError('存在未闭合的括号')
  return result
}
