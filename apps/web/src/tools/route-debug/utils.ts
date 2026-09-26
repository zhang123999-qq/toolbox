import type { RouteDebugInput, RouteDebugOptions } from './schema'

const MAX_INPUT = 200_000

/** 把单段路径转成正则片段（返回片段与捕获组名） */
function segmentToRegex(segment: string): { readonly regex: string; readonly names: string[] } {
  const names: string[] = []
  // 通配 *：命名捕获剩余整段（含斜杠）
  if (segment === '*') {
    names.push('splat')
    return { regex: '(?<splat>.+)', names }
  }
  // 可选参数 :name?
  const optional = /^:([a-zA-Z_][a-zA-Z0-9_]*)\?$/.exec(segment)
  if (optional) {
    const name = optional[1] as string
    names.push(name)
    return { regex: `(?:/(?<${name}>[^/]+))?`, names }
  }
  // 带正则约束 :name(regex)
  const constrained = /^:([a-zA-Z_][a-zA-Z0-9_]*)\((.+)\)$/.exec(segment)
  if (constrained) {
    const name = constrained[1] as string
    const inner = constrained[2] as string
    names.push(name)
    return { regex: `(?<${name}>${inner})`, names }
  }
  // 普通参数 :name
  const param = /^:([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(segment)
  if (param) {
    const name = param[1] as string
    names.push(name)
    return { regex: `(?<${name}>[^/]+)`, names }
  }
  // 静态段：转义
  return { regex: segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), names }
}

/** 编译路由模式为正则 */
export function compilePattern(pattern: string): {
  readonly regex: RegExp
  readonly names: string[]
} {
  const trimmed = pattern.trim()
  if (trimmed === '') throw new Error('路由规则不能为空')
  const segments = trimmed.split('/').filter((s) => s !== '')
  const names: string[] = []
  let source = '^/'
  segments.forEach((seg, i) => {
    const { regex, names: segNames } = segmentToRegex(seg)
    names.push(...segNames)
    if (i === 0) {
      source += regex
    } else if (regex.startsWith('(?:/')) {
      source += regex
    } else {
      source += '/' + regex
    }
  })
  source += '/?$'
  return { regex: new RegExp(source), names }
}

/** 匹配路径，返回参数对象或 null */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const { regex } = compilePattern(pattern)
  const m = regex.exec(path.trim())
  if (!m) return null
  return (m.groups ?? {}) as Record<string, string>
}

export function transform(input: RouteDebugInput, options: RouteDebugOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  const path = input.text.trim()
  const pattern = options.pattern.trim()
  if (pattern === '') throw new Error('路由规则（pattern）不能为空')
  const params = matchPath(pattern, path)
  if (params === null) {
    return `不匹配\n\n路径: ${path}\n规则: ${pattern}\n\n该路径不命中此路由。`
  }
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `  ${k}: ${decodeURIComponent(v)}`)
  return [
    `匹配成功`,
    '',
    `路径: ${path}`,
    `规则: ${pattern}`,
    '',
    '提取到的参数：',
    ...(entries.length > 0 ? entries : ['  (无命名参数)']),
  ].join('\n')
}
