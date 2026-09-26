import type { CodeMinifyInput, CodeMinifyOptions } from './schema'

const MAX_INPUT = 200_000

export const LANGUAGES = ['js', 'css', 'html'] as const

/**
 * 压缩 JS：去掉 // 行注释与 /* 块注释 *\/，再把多余空白压成单空格。
 * 字符串（'...' "..." `...`）原样保留，内部空白不被压缩。
 */
export function minifyJs(code: string): string {
  let out = ''
  let i = 0
  const pushSpace = () => {
    if (out !== '' && !/\s$/.test(out)) out += ' '
  }
  while (i < code.length) {
    const ch = code[i] as string
    // 行注释
    if (ch === '/' && code[i + 1] === '/') {
      i += 2
      while (i < code.length && code[i] !== '\n') i += 1
      continue
    }
    // 块注释：删除但补一个分隔空格，避免两侧标识符粘连（a/*c*/b 不能变成 ab）
    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i += 1
      i += 2
      pushSpace()
      continue
    }
    // 字符串原样保留（含内部空白）
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      out += ch
      i += 1
      while (i < code.length) {
        out += code[i]
        if (code[i] === '\\') {
          out += code[i + 1] ?? ''
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
    // 行内空白（空格/Tab）压成单空格
    if (ch === ' ' || ch === '\t') {
      pushSpace()
      i += 1
      continue
    }
    // 换行必须保留：无分号风格依赖 ASI，压成空格会把 `a=b\n(c)` 错改成调用 a=b(c)
    if (ch === '\r') {
      i += 1
      continue
    }
    if (ch === '\n') {
      if (out.endsWith(' ')) out = out.slice(0, -1) // 去掉行尾悬空格
      if (out !== '' && !out.endsWith('\n')) out += '\n' // 连续空行折叠为一个
      i += 1
      continue
    }
    out += ch
    i += 1
  }
  return out.trim()
}

/** 压缩 CSS：去掉 /* 注释 *\/，规则间不留多余空白；字符串内空白保留 */
export function minifyCss(code: string): string {
  let out = ''
  let i = 0
  const pushSpace = () => {
    if (out !== '' && !/\s$/.test(out)) out += ' '
  }
  while (i < code.length) {
    const ch = code[i] as string
    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i += 1
      i += 2
      continue
    }
    // 字符串原样
    if (ch === '"' || ch === "'") {
      const quote = ch
      out += ch
      i += 1
      while (i < code.length) {
        out += code[i]
        if (code[i] === quote) {
          i += 1
          break
        }
        i += 1
      }
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pushSpace()
      i += 1
      continue
    }
    out += ch
    i += 1
  }
  return out.replace(/;}/g, '}').trim()
}

/** 压缩 HTML：去掉 <!-- 注释 -->，标签间空白压成单空格 */
export function minifyHtml(code: string): string {
  const noComments = code.replace(/<!--[\s\S]*?-->/g, '')
  return noComments.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
}

export function transform(input: CodeMinifyInput, options: CodeMinifyOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  switch (options.language) {
    case 'js':
      return minifyJs(input.text)
    case 'css':
      return minifyCss(input.text)
    case 'html':
      return minifyHtml(input.text)
    default:
      throw new Error('不支持的语言：' + String(options.language))
  }
}
