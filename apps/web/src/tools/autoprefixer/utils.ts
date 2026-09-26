import type { AutoprefixerInput, AutoprefixerOptions } from './schema'

const MAX_INPUT = 200_000

/**
 * 静态前缀规则表：property → 需要追加的前缀属性列表。
 * 来源于 caniuse 常见需前缀属性（不再需要前缀的属性不收）。
 */
const PREFIX_MAP: Record<string, readonly string[]> = {
  transform: ['-webkit-transform', '-ms-transform'],
  transition: ['-webkit-transition'],
  'transition-property': ['-webkit-transition-property'],
  animation: ['-webkit-animation'],
  'animation-name': ['-webkit-animation-name'],
  'animation-duration': ['-webkit-animation-duration'],
  'animation-timing-function': ['-webkit-animation-timing-function'],
  'animation-delay': ['-webkit-animation-delay'],
  'animation-iteration-count': ['-webkit-animation-iteration-count'],
  'animation-direction': ['-webkit-animation-direction'],
  'animation-fill-mode': ['-webkit-animation-fill-mode'],
  'user-select': ['-webkit-user-select', '-moz-user-select', '-ms-user-select'],
  'backdrop-filter': ['-webkit-backdrop-filter'],
  'backface-visibility': ['-webkit-backface-visibility'],
  appearance: ['-webkit-appearance', '-moz-appearance'],
  'column-count': ['-webkit-column-count', '-moz-column-count'],
  'column-gap': ['-webkit-column-gap', '-moz-column-gap'],
  'column-rule': ['-webkit-column-rule', '-moz-column-rule'],
  'tab-size': ['-moz-tab-size'],
  flex: ['-webkit-box-flex', '-ms-flex'],
  'flex-direction': ['-webkit-box-orient', '-ms-flex-direction'],
  'justify-content': ['-webkit-box-pack', '-ms-flex-pack'],
  'align-items': ['-webkit-box-align', '-ms-flex-align'],
}

/** 处理单条声明，返回 0..n 行声明 */
function prefixDeclaration(prop: string, value: string, indent: string): string[] {
  const trimmedProp = prop.trim()
  const trimmedValue = value.trim().replace(/;$/, '')

  // display: flex → 三套 display
  if (trimmedProp === 'display' && trimmedValue === 'flex') {
    return [
      `${indent}display: -webkit-box;`,
      `${indent}display: -ms-flexbox;`,
      `${indent}display: flex;`,
    ]
  }

  // background / background-image 里的渐变：加 -webkit- 前缀渐变
  if (
    (trimmedProp === 'background' || trimmedProp === 'background-image') &&
    /linear-gradient\(/.test(trimmedValue)
  ) {
    const webkitValue = trimmedValue.replace(/linear-gradient\(/g, '-webkit-linear-gradient(')
    return [`${indent}${trimmedProp}: ${webkitValue};`, `${indent}${trimmedProp}: ${trimmedValue};`]
  }

  const prefixes = PREFIX_MAP[trimmedProp]
  if (prefixes && prefixes.length > 0) {
    return [
      ...prefixes.map((p) => `${indent}${p}: ${trimmedValue};`),
      `${indent}${trimmedProp}: ${trimmedValue};`,
    ]
  }
  return [`${indent}${trimmedProp}: ${trimmedValue};`]
}

/** 解析一条 `selector { ... }` 规则块并加前缀 */
function prefixRule(rule: string): string {
  const match = /^([^{]+)\{([\s\S]*)\}$/.exec(rule.trim())
  if (!match) return rule
  const selector = (match[1] as string).trim()
  const body = match[2] as string
  // 按 ; 切分声明，保留注释原样（注释行单独保留）
  const declarations: string[] = []
  // 简单按行/分号切分；注释行直接透传
  const parts = body.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed === '') continue
    if (trimmed.startsWith('/*') || trimmed.startsWith('//') || trimmed.startsWith('@')) {
      declarations.push(`  ${trimmed}`)
      continue
    }
    const colon = trimmed.indexOf(':')
    if (colon < 0) {
      declarations.push(`  ${trimmed};`)
      continue
    }
    const prop = trimmed.slice(0, colon)
    const value = trimmed.slice(colon + 1)
    declarations.push(...prefixDeclaration(prop, value, '  '))
  }
  return `${selector} {\n${declarations.join('\n')}\n}`
}

/** 把 CSS 文本按规则块拆分（保留块注释与 @ 规则） */
export function autoprefix(code: string): string {
  const out: string[] = []
  let i = 0
  // 先把 /* */ 注释保留为占位，避免误拆
  while (i < code.length) {
    // 注释块整体保留
    if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      if (end < 0) {
        out.push(code.slice(i))
        break
      }
      out.push(code.slice(i, end + 2))
      i = end + 2
      continue
    }
    // @ 规则（@media / @keyframes ...）整体透传，不深入处理
    if (code[i] === '@') {
      // 找到匹配的块
      const open = code.indexOf('{', i)
      if (open < 0) {
        out.push(code.slice(i).trim())
        break
      }
      // 数花括号找配对
      let depth = 1
      let j = open + 1
      while (j < code.length && depth > 0) {
        if (code[j] === '{') depth += 1
        else if (code[j] === '}') depth -= 1
        j += 1
      }
      out.push(code.slice(i, j).trim())
      i = j
      continue
    }
    // 普通规则：selector { ... }
    const open = code.indexOf('{', i)
    if (open < 0) {
      out.push(code.slice(i).trim())
      break
    }
    let depth = 1
    let j = open + 1
    while (j < code.length && depth > 0) {
      if (code[j] === '{') depth += 1
      else if (code[j] === '}') depth -= 1
      j += 1
    }
    out.push(prefixRule(code.slice(i, j)))
    i = j
  }
  return out.filter(Boolean).join('\n')
}

export function transform(input: AutoprefixerInput, _options: AutoprefixerOptions): string {
  void _options
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return autoprefix(input.text)
}
