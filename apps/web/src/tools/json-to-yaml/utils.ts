import type { JsonToYamlInput, JsonToYamlOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToYamlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToYamlError'
  }
}

const MAX_INPUT = 2_000_000

/** 看起来像 YAML 布尔 / 空值的裸词 */
const YAML_WORDS = /^(~|null|true|false|yes|no|on|off|y|n)$/i
/** 看起来像数字 / 特殊数值的裸词 */
const YAML_NUMBER = /^[+-]?(\.inf|\.nan|0x[0-9a-fA-F]+|[0-9][0-9_]*(\.[0-9]*)?([eE][+-]?[0-9]+)?)$/
/** 这些字符出现在普通标量里会引起歧义，需要双引号 */
const YAML_SPECIAL = /[:#[\]{}&*!|>'"%@`\n\t]/

/** 判断普通（plain）字符串是否安全；有歧义就退化为双引号 */
export function needsQuoting(text: string): boolean {
  if (text === '') return true
  if (text !== text.trim()) return true
  if (YAML_WORDS.test(text) || YAML_NUMBER.test(text)) return true
  const first = text[0] as string
  if ('-?:,[]{}#&*!|>\'"%@`'.includes(first)) return true
  if (YAML_SPECIAL.test(text)) return true
  if (text.endsWith(':') || text.includes(': ') || text.includes(' #')) return true
  return false
}

/** 双引号标量：JSON.stringify 的转义结果在 YAML 双引号里同样合法 */
function doubleQuoted(text: string): string {
  return JSON.stringify(text)
}

interface Ctx {
  readonly unit: number
  readonly quote: JsonToYamlOptions['quote']
}

function spaces(col: number): string {
  return ' '.repeat(col)
}

/** 行内标量 */
function renderScalar(value: unknown, ctx: Ctx): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  const text = String(value)
  return ctx.quote === 'all' || needsQuoting(text) ? doubleQuoted(text) : text
}

/** 渲染对象；firstPrefix 用于「序列项里的首键」与 "- " 同一行 */
function emitObject(
  obj: Record<string, unknown>,
  col: number,
  ctx: Ctx,
  firstPrefix?: string,
): string[] {
  const lines: string[] = []
  Object.entries(obj).forEach(([key, value], index) => {
    const prefix = index === 0 && firstPrefix !== undefined ? firstPrefix : spaces(col)
    const keyText = needsQuoting(key) ? doubleQuoted(key) : key

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${keyText}: []`)
      } else {
        lines.push(`${prefix}${keyText}:`)
        lines.push(...emitArray(value, col + ctx.unit, ctx))
      }
      return
    }
    if (value !== null && typeof value === 'object') {
      if (Object.keys(value).length === 0) {
        lines.push(`${prefix}${keyText}: {}`)
      } else {
        lines.push(`${prefix}${keyText}:`)
        lines.push(...emitObject(value as Record<string, unknown>, col + ctx.unit, ctx))
      }
      return
    }
    lines.push(`${prefix}${keyText}: ${renderScalar(value, ctx)}`)
  })
  return lines
}

function emitArray(arr: readonly unknown[], col: number, ctx: Ctx): string[] {
  const lines: string[] = []
  for (const item of arr) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      // 对象项：首键与 "- " 同行，其余键对齐到 col + 2
      lines.push(...emitObject(item as Record<string, unknown>, col + 2, ctx, `${spaces(col)}- `))
    } else if (Array.isArray(item)) {
      // 嵌套序列：外层 "- " 后直接接内层首个 "- x"，其余内层项对齐
      const inner = emitArray(item, col + 2, ctx)
      const [first, ...rest] = inner
      lines.push(`${spaces(col)}- ${(first as string).slice(col + 2)}`)
      lines.push(...rest)
    } else {
      lines.push(`${spaces(col)}- ${renderScalar(item, ctx)}`)
    }
  }
  return lines
}

/**
 * JSON 转 YAML。
 * 空输入返回空串；非法 JSON 抛 JsonToYamlError。
 */
export function transform(input: JsonToYamlInput, options: JsonToYamlOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToYamlError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToYamlError('不是合法的 JSON')
  }

  const ctx: Ctx = { unit: Number.parseInt(options.indent, 10), quote: options.quote }

  if (parsed === null || typeof parsed !== 'object') return renderScalar(parsed, ctx)
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return '[]'
    return emitArray(parsed, 0, ctx).join('\n')
  }
  const obj = parsed as Record<string, unknown>
  if (Object.keys(obj).length === 0) return '{}'
  return emitObject(obj, 0, ctx).join('\n')
}
