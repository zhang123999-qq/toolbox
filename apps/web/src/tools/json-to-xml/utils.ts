import type { JsonToXmlInput, JsonToXmlOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class JsonToXmlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonToXmlError'
  }
}

const MAX_INPUT = 2_000_000

/** XML 文本转义（文本节点里 " 与 ' 不强制转义，这里统一只转必要的三个） */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 把任意 JSON 键 / 自定义根名归一成合法 XML Name；非法字符替换为下划线 */
export function toXmlName(text: string): string {
  let name = String(text).replace(/[^A-Za-z0-9_.-]/g, '_')
  if (name === '' || /^[-.0-9]/.test(name)) name = `_${name}`
  return name
}

interface Ctx {
  readonly unit: string
}

function spaces(col: number, unit: string): string {
  return unit.repeat(col)
}

/** 渲染一个具名值；col 是该元素所在缩进列 */
function emitElement(name: string, value: unknown, col: number, ctx: Ctx): string[] {
  const { unit } = ctx
  if (value === null || value === undefined) return [`${spaces(col, unit)}<${name}/>`]

  if (Array.isArray(value)) {
    // 空数组自闭合；非空数组重复同名元素
    if (value.length === 0) return [`${spaces(col, unit)}<${name}/>`]
    const lines: string[] = []
    for (const item of value) lines.push(...emitElement(name, item, col, ctx))
    return lines
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
    if (keys.length === 0) return [`${spaces(col, unit)}<${name}/>`]
    const lines = [`${spaces(col, unit)}<${name}>`]
    for (const key of keys) lines.push(...emitElement(toXmlName(key), obj[key], col + 1, ctx))
    lines.push(`${spaces(col, unit)}</${name}>`)
    return lines
  }

  const text = escapeText(String(value))
  if (text === '') return [`${spaces(col, unit)}<${name}/>`]
  return [`${spaces(col, unit)}<${name}>${text}</${name}>`]
}

/**
 * JSON 转 XML。
 * 空输入返回空串；非法 JSON 抛 JsonToXmlError。
 */
export function transform(input: JsonToXmlInput, options: JsonToXmlOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new JsonToXmlError('输入超过 2,000,000 字符上限')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input.text)
  } catch {
    throw new JsonToXmlError('不是合法的 JSON')
  }

  const unit = options.indent === 'tab' ? '\t' : ' '.repeat(Number.parseInt(options.indent, 10))
  const ctx: Ctx = { unit }
  const root = toXmlName(options.rootName.trim() || 'root')

  let body: string[]
  if (Array.isArray(parsed)) {
    // 顶层数组：根下重复 <item>
    body = [`<${root}>`]
    for (const item of parsed) body.push(...emitElement('item', item, 1, ctx))
    body.push(`</${root}>`)
  } else if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (Object.keys(obj).length === 0) {
      body = [`<${root}/>`]
    } else {
      body = [`<${root}>`]
      for (const key of Object.keys(obj))
        body.push(...emitElement(toXmlName(key), obj[key], 1, ctx))
      body.push(`</${root}>`)
    }
  } else {
    body = [`<${root}>${escapeText(String(parsed))}</${root}>`]
  }

  const declaration = options.declaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : ''
  return declaration + body.join('\n')
}
