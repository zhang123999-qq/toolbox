import type { UrlInput } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class UrlParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlParseError'
  }
}

const MAX_INPUT = 10_000

export interface UrlParts {
  href: string
  origin: string
  protocol: string
  username: string
  password: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  searchParams: Record<string, string | string[]>
}

/**
 * 解析 URL —— 纯函数，依赖标准库 URL，可在 node / jsdom 双环境运行。
 * 只接受绝对 URL（带协议）；相对路径会提示补全协议。
 */
export function transform(input: UrlInput): string {
  const raw = input.text.trim()
  if (!raw) return ''

  if (raw.length > MAX_INPUT) {
    throw new UrlParseError('输入超过 10000 字符上限')
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UrlParseError('不是合法的绝对 URL，请补全协议（如 https://）')
  }

  return JSON.stringify(toParts(url), null, 2)
}

/** URL → 可序列化的结构化对象，重复查询参数合并为数组 */
export function toParts(url: URL): UrlParts {
  const searchParams: Record<string, string | string[]> = {}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key)
    searchParams[key] = values.length > 1 ? values : values[0]
  }

  return {
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    searchParams,
  }
}
