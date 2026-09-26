import type { CodeBeautifyInput, CodeBeautifyOptions } from './schema'

const MAX_INPUT = 200_000

export const LANGUAGES = ['js', 'css', 'html', 'json', 'sql'] as const
export const INDENTS = ['2', '4', 'tab'] as const

/** 缩进单位：tab 用制表符，否则按档位给空格 */
export function indentUnit(indent: string): string {
  if (indent === 'tab') return '\t'
  return ' '.repeat(Number(indent))
}

/** 跳过字符串与注释，返回每个字符是否处于「裸代码区」——避免把字符串里的 { } 当结构 */
function maskLiterals(code: string): boolean[] {
  const mask = new Array<boolean>(code.length).fill(true)
  let i = 0
  while (i < code.length) {
    const ch = code[i] as string
    // 行注释
    if (ch === '/' && code[i + 1] === '/') {
      let j = i
      while (j < code.length && code[j] !== '\n') {
        mask[j] = false
        j += 1
      }
      i = j
      continue
    }
    // 块注释
    if (ch === '/' && code[i + 1] === '*') {
      let j = i
      mask[j] = false
      mask[j + 1] = false
      j += 2
      while (j < code.length && !(code[j] === '*' && code[j + 1] === '/')) {
        mask[j] = false
        j += 1
      }
      if (j < code.length) {
        mask[j] = false
        mask[j + 1] = false
        j += 2
      }
      i = j
      continue
    }
    // 字符串
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      mask[i] = false
      i += 1
      while (i < code.length) {
        mask[i] = false
        if (code[i] === '\\') {
          mask[i + 1] = false
          i += 2
          continue
        }
        if (code[i] === quote) {
          i += 1
          break
        }
        i += 1
      }
      continue
    }
    i += 1
  }
  return mask
}

/**
 * JS 美化：按 { } ( ) [ ] 括号缩进，分号与逗号后保持同行。
 * 仅在「裸代码区」数括号，字符串/注释里的括号不影响缩进。
 */
export function beautifyJs(code: string, unit: string): string {
  const mask = maskLiterals(code)
  // 先把整段压成单行（去多余空白），再按括号换行
  let compact = ''
  for (let i = 0; i < code.length; i += 1) {
    if (mask[i]) {
      const ch = code[i] as string
      if (ch === '\n' || ch === '\r' || ch === '\t') {
        compact += ' '
        continue
      }
    }
    compact += code[i]
  }
  compact = compact.replace(/[ \t\r\n]+/g, ' ').trim()
  if (compact === '') return ''

  // 在压平后的文本上重新打掩码：字符串/注释里的 {}; 不参与结构判断
  const compactMask = maskLiterals(compact)
  const out: string[] = []
  let depth = 0
  let line = ''
  const pushLine = () => {
    const trimmed = line.trim()
    if (trimmed !== '') out.push(unit.repeat(depth) + trimmed)
    line = ''
  }
  for (let i = 0; i < compact.length; i += 1) {
    const ch = compact[i] as string
    const inCode = compactMask[i]
    if (inCode && ch === '{') {
      if (line !== '' && !/[\s([{,]$/.test(line)) line += ' '
      line += ch
      pushLine()
      depth += 1
    } else if (inCode && ch === '}') {
      depth = Math.max(0, depth - 1)
      if (line.trim() !== '') pushLine()
      line = ch
      const next = compact[i + 1] as string | undefined
      if (
        next !== undefined &&
        compactMask[i + 1] &&
        !['.', ',', ';', ')', ']', '}'].includes(next)
      ) {
        pushLine()
      }
    } else if (inCode && ch === ';') {
      line += ch
      pushLine()
    } else {
      line += ch
    }
  }
  pushLine()
  return out.join('\n')
}

/** CSS 美化：按规则块缩进，声明每条一行 */
export function beautifyCss(code: string, unit: string): string {
  const mask = maskLiterals(code)
  const out: string[] = []
  let depth = 0
  let line = ''
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i] as string
    const inCode = mask[i]
    line += ch
    if (inCode && ch === '{') {
      out.push(unit.repeat(depth) + line.trim().replace(/\s*\{?$/, ' {'))
      depth += 1
      line = ''
    } else if (inCode && ch === '}') {
      depth = Math.max(0, depth - 1)
      out.push(unit.repeat(depth) + line.trim())
      line = ''
    } else if (inCode && ch === ';') {
      out.push(unit.repeat(depth) + line.trim())
      line = ''
    }
  }
  if (line.trim() !== '') out.push(unit.repeat(depth) + line.trim())
  return out.join('\n')
}

/** HTML 美化：块级标签按层级缩进，文本节点随父标签缩进 */
export function beautifyHtml(code: string, unit: string): string {
  const voidTags = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ])
  const noGap = code.replace(/>\s+</g, '><').replace(/\s+/g, ' ')
  const out: string[] = []
  let depth = 0
  let buffer = ''
  const flushText = () => {
    const text = buffer.trim()
    if (text !== '') out.push(unit.repeat(depth) + text)
    buffer = ''
  }
  const tagRe = /<[^>]+>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(noGap)) !== null) {
    const textBefore = noGap.slice(last, m.index)
    if (textBefore.trim() !== '') buffer += textBefore
    const tag = m[0] as string
    const isClose = tag.startsWith('</')
    const isSelfClose = tag.endsWith('/>')
    const nameMatch = /^<\/?\s*([a-zA-Z0-9-]+)/.exec(tag)
    const name = (nameMatch?.[1] ?? '').toLowerCase()
    const isVoid = voidTags.has(name)
    if (isClose) {
      flushText()
      depth = Math.max(0, depth - 1)
      out.push(unit.repeat(depth) + tag)
    } else if (isSelfClose || isVoid) {
      buffer += tag
    } else {
      flushText()
      out.push(unit.repeat(depth) + tag)
      depth += 1
    }
    last = m.index + tag.length
  }
  if (last < noGap.length) buffer += noGap.slice(last)
  flushText()
  return out.join('\n')
}

/** JSON 美化：交给原生 JSON.parse / stringify，缩进单位按选项 */
export function beautifyJson(code: string, unit: string): string {
  try {
    const obj = JSON.parse(code)
    return JSON.stringify(obj, null, unit)
  } catch {
    throw new Error('JSON 解析失败：请检查括号与逗号是否成对')
  }
}

/** SQL 美化：子句关键字另起一行，字符串/注释内的关键字不触发换行 */
export function beautifySql(code: string, unit: string): string {
  const clause = new Set([
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP',
    'BY',
    'HAVING',
    'ORDER',
    'LIMIT',
    'OFFSET',
    'UNION',
    'LEFT',
    'RIGHT',
    'INNER',
    'OUTER',
    'FULL',
    'CROSS',
    'JOIN',
    'ON',
    'INSERT',
    'INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'CREATE',
    'ALTER',
    'DROP',
  ])
  // 压成单空格
  const flat = code.replace(/\s+/g, ' ').trim()
  if (flat === '') return ''
  // 用掩码区分裸代码区与字符串/注释区，避免把字符串里的关键字当子句
  const mask = maskLiterals(flat)
  const out: string[] = []
  let line = ''
  const flush = () => {
    const trimmed = line.trim()
    if (trimmed !== '') out.push(unit.repeat(0) + trimmed)
    line = ''
  }
  // 逐字符扫描，按空白/逗号/括号/分号切 token，记录 token 起点是否在裸代码区
  let i = 0
  while (i < flat.length) {
    const ch = flat[i] as string
    if (ch === ' ' || ch === ',' || ch === '(' || ch === ')' || ch === ';') {
      line += ch
      i += 1
      continue
    }
    let j = i
    while (j < flat.length && !' ,();'.includes(flat[j] as string)) j += 1
    const token = flat.slice(i, j)
    if (mask[i] && clause.has(token.toUpperCase())) flush()
    line += token
    i = j
  }
  flush()
  return out.join('\n')
}

/**
 * 入口：空输入短路；超长报错；按语言分派。
 */
export function transform(input: CodeBeautifyInput, options: CodeBeautifyOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  const unit = indentUnit(options.indent)
  switch (options.language) {
    case 'js':
      return beautifyJs(input.text, unit)
    case 'css':
      return beautifyCss(input.text, unit)
    case 'html':
      return beautifyHtml(input.text, unit)
    case 'json':
      return beautifyJson(input.text, unit)
    case 'sql':
      return beautifySql(input.text, unit)
    default:
      throw new Error('不支持的语言：' + String(options.language))
  }
}
