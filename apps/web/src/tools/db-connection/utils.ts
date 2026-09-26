import type { DbConnectionInput, DbConnectionOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

const DEFAULT_PORT: Record<string, string> = {
  mysql: '3306',
  postgresql: '5432',
  mongodb: '27017',
  redis: '6379',
}

/** URL 编码用户信息中的特殊字符 */
function enc(v: string): string {
  return encodeURIComponent(v)
}

/** 主机：localhost / IPv4 / DNS 域名，拒绝空白、控制字符与 @ : / ? # 等分隔符 */
function validateHost(raw: string): string {
  const h = raw.trim()
  if (h === '') return 'localhost'
  if (
    hasControlChar(h) ||
    /\s/.test(h) ||
    /[@:/?#]/.test(h) ||
    h.includes('[') ||
    h.includes(']')
  ) {
    throw new Error(`主机地址包含非法字符：${h}（应为域名、localhost 或 IPv4）`)
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const m = h.match(ipv4)
  if (m) {
    for (const oct of m.slice(1)) if (Number(oct) > 255) throw new Error(`IPv4 地址段非法：${oct}`)
    return h
  }
  if (
    !/^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/.test(
      h,
    )
  ) {
    throw new Error(`主机地址不合法：${h}`)
  }
  return h
}

/** 端口：1-65535 整数 */
function validatePort(raw: string, fallback: string): string {
  const p = raw.trim()
  if (p === '') return fallback
  if (!/^\d{1,5}$/.test(p)) throw new Error(`端口必须是数字：${p}`)
  const n = Number(p)
  if (n < 1 || n > 65535) throw new Error(`端口必须在 1-65535 之间：${p}`)
  return p
}

export function buildConnection(options: DbConnectionOptions): string {
  const { dbType, host, port, user, password, dbname } = options

  if (dbType === 'sqlite') {
    const path = dbname.trim() || ':memory:'
    if (hasControlChar(path) || /\s/.test(path)) throw new Error('SQLite 路径不能包含空白或换行')
    return `sqlite://${path}`
  }

  const h = validateHost(host)
  const p = validatePort(port, DEFAULT_PORT[dbType] ?? '')
  const auth = user.trim() ? `${enc(user.trim())}${password ? ':' + enc(password) : ''}@` : ''

  if (dbType === 'mongodb') {
    const db = dbname.trim() ? '/' + enc(dbname.trim()) : ''
    return `mongodb://${auth}${h}:${p}${db}`
  }
  if (dbType === 'redis') {
    const authPart = password ? `?password=${enc(password)}` : ''
    return `redis://${auth}${h}:${p}${authPart}`
  }

  // mysql / postgresql
  const scheme = dbType === 'mysql' ? 'mysql' : 'postgresql'
  const db = dbname.trim() ? '/' + enc(dbname.trim()) : ''
  return `${scheme}://${auth}${h}:${p}${db}`
}

export function transform(input: DbConnectionInput, options: DbConnectionOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return buildConnection(options)
}
