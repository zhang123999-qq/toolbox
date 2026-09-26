import type { CodeToImageInput, CodeToImageOptions } from './schema'

const MAX_INPUT = 200_000

export interface Token {
  readonly text: string
  readonly kind: 'plain' | 'keyword' | 'string' | 'comment' | 'number'
}

const JS_KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'class',
  'new',
  'typeof',
  'import',
  'export',
  'from',
  'default',
  'async',
  'await',
  'try',
  'catch',
  'throw',
  'this',
  'true',
  'false',
  'null',
  'undefined',
])

/** 把代码按行切分 */
export function splitLines(code: string): string[] {
  return code.replace(/\r\n?/g, '\n').split('\n')
}

/** 轻量语法高亮 token 化：识别注释 / 字符串 / 数字 / 关键字 */
export function tokenizeLine(line: string, language: CodeToImageOptions['language']): Token[] {
  const tokens: Token[] = []
  if (language === 'css') {
    // CSS 注释 /* */ 与选择器/属性，简化处理
    const commentMatch = /^\s*\/\*/.test(line)
    if (commentMatch) return [{ text: line, kind: 'comment' }]
    return [{ text: line, kind: 'plain' }]
  }
  if (language === 'html') {
    if (/^\s*</.test(line)) return [{ text: line, kind: 'keyword' }]
    return [{ text: line, kind: 'plain' }]
  }
  if (language === 'plain') {
    return [{ text: line, kind: 'plain' }]
  }
  // js
  const commentIdx = line.indexOf('//')
  let rest = line
  let comment = ''
  if (commentIdx >= 0) {
    comment = line.slice(commentIdx)
    rest = line.slice(0, commentIdx)
  }
  // 用正则切 token
  const re = /("[^"]*"|'[^']*'|`[^`]*`|\b\d+(?:\.\d+)?\b|[a-zA-Z_$][a-zA-Z0-9_$]*|\s+|.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rest)) !== null) {
    const text = m[0] as string
    if (/^["'`]/.test(text)) tokens.push({ text, kind: 'string' })
    else if (/^\d/.test(text)) tokens.push({ text, kind: 'number' })
    else if (/^[a-zA-Z_$]/.test(text) && JS_KEYWORDS.has(text))
      tokens.push({ text, kind: 'keyword' })
    else tokens.push({ text, kind: 'plain' })
  }
  if (comment !== '') tokens.push({ text: comment, kind: 'comment' })
  return tokens
}

const THEME = {
  dark: {
    bg: '#1e1e1e',
    text: '#d4d4d4',
    plain: '#d4d4d4',
    keyword: '#569cd6',
    string: '#ce9178',
    comment: '#6a9955',
    number: '#b5cea8',
  },
  light: {
    bg: '#ffffff',
    text: '#333333',
    plain: '#333333',
    keyword: '#0000ff',
    string: '#a31515',
    comment: '#008000',
    number: '#098658',
  },
} as const

/**
 * 用 canvas 绘制代码为 PNG 数据 URL。
 * jsdom 下没有真实 canvas，getContext 返回 null，此时返回可读提示（不报错）。
 */
export function renderToCanvas(code: string, options: CodeToImageOptions): string {
  const theme = THEME[options.theme]
  const fontSize = Number(options.fontSize)
  const lineHeight = fontSize * 1.5
  const padding = 20
  const lines = splitLines(code)
  const width = 800
  const height = Math.max(120, padding * 2 + lines.length * lineHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return `（当前环境不支持 canvas，无法生成图片。共 ${lines.length} 行，主题 ${options.theme}，字号 ${fontSize}px）`
  }
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, width, height)
  ctx.font = `${fontSize}px Menlo, Consolas, monospace`
  lines.forEach((line, i) => {
    let x = padding
    const y = padding + fontSize + i * lineHeight
    const tokens = tokenizeLine(line, options.language)
    for (const token of tokens) {
      ctx.fillStyle = theme[token.kind]
      ctx.fillText(token.text, x, y)
      x += ctx.measureText(token.text).width
    }
  })
  return canvas.toDataURL('image/png')
}

export function transform(input: CodeToImageInput, options: CodeToImageOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return renderToCanvas(input.text, options)
}
