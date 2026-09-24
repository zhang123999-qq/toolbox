import type { CookieInput, CookieOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class CookieError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CookieError'
  }
}

const MAX_INPUT = 100_000

export type CookieValue = string | boolean
export type CookieObject = Record<string, CookieValue>

/**
 * Cookie 串与对象互转 —— 纯函数，不依赖 React / DOM。
 * mode=parse：`a=1; Path=/; HttpOnly` → 对象（无值属性记为 true）
 * mode=build：对象 → Cookie 串（值为 true 的键只输出键名）
 */
export function transform(input: CookieInput, options: CookieOptions): string {
  const raw = input.text.trim()
  if (!raw) return ''

  if (raw.length > MAX_INPUT) {
    throw new CookieError('输入超过 100000 字符上限')
  }

  return options.mode === 'build'
    ? build(raw, options.sortKeys)
    : JSON.stringify(parse(raw, options.sortKeys), null, 2)
}

/** Cookie 串 → 对象；无 `=` 的属性（HttpOnly / Secure 等）记为 true */
export function parse(text: string, sortKeys: boolean): CookieObject {
  const result: CookieObject = {}
  for (const segment of text.split(';')) {
    const pair = segment.trim()
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq === -1) {
      result[pair] = true
    } else {
      result[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
    }
  }

  if (!sortKeys) return result
  const sorted: CookieObject = {}
  for (const key of Object.keys(result).sort()) sorted[key] = result[key]
  return sorted
}

/** 对象（JSON 文本）→ Cookie 串 */
export function build(text: string, sortKeys: boolean): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new CookieError('不是合法的 JSON 对象')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CookieError('生成模式要求输入为 JSON 对象')
  }

  const source = parsed as Record<string, unknown>
  const keys = Object.keys(source)
  const parts: string[] = []
  for (const key of sortKeys ? [...keys].sort() : keys) {
    const value = source[key]
    parts.push(value === true ? key : `${key}=${String(value)}`)
  }
  return parts.join('; ')
}
