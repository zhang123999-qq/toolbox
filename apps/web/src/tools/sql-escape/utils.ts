import type { SqlEscapeInput, SqlEscapeOptions } from './schema'

/**
 * MySQL 默认开启反斜杠转义，这些字符必须写成 `\x` 形式。
 * 反斜杠排在最前，避免后续替换把它自己再转一遍。
 */
const MYSQL_ESCAPE: Record<string, string> = {
  '\\': '\\\\',
  '\u0000': '\\0',
  '\u001a': '\\Z',
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
  "'": "\\'",
  '"': '\\"',
}

/** 反向表：转义字母 → 原字符（供还原使用） */
const MYSQL_UNESCAPE: Record<string, string> = {
  '0': '\u0000',
  Z: '\u001a',
  b: '\b',
  t: '\t',
  n: '\n',
  r: '\r',
  '\\': '\\',
  "'": "'",
  '"': '"',
}

/**
 * 转义。MySQL 走反斜杠转义；PostgreSQL（standard_conforming_strings 默认开启）
 * 与 SQL Server 都按标准只把单引号写成两个，反斜杠是普通字符。
 */
export function escapeSql(text: string, type: string): string {
  if (type === 'mysql') {
    let out = ''
    for (const char of text) out += MYSQL_ESCAPE[char] ?? char
    return out
  }
  return text.replace(/'/g, "''")
}

/** 剥掉字面量首尾的单引号（兼容 SQL Server 的 N'...' 前缀），不是字面量就原样返回 */
function stripQuotes(text: string): string {
  const prefixed = /^[Nn]'([\s\S]*)'$/.exec(text)
  if (prefixed?.[1] !== undefined) return prefixed[1]
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1)
  return text
}

/**
 * 还原。MySQL 走反斜杠扫描，同时兼容 `''` 双写；其余库只把两个单引号并回一个。
 * 先剥掉首尾引号，因此带引号和不带引号的输入都能直接粘进来。
 */
export function unescapeSql(text: string, type: string): string {
  const body = stripQuotes(text)
  if (type !== 'mysql') return body.replace(/''/g, "'")

  let out = ''
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i] as string
    if (char === '\\') {
      const next = body[i + 1]
      if (next === undefined) throw new Error('解码失败：输入以孤立的反斜杠结尾')
      // MySQL 里未知的转义（如 \% ）等于字符本身
      out += MYSQL_UNESCAPE[next] ?? next
      i += 1
      continue
    }
    if (char === "'" && body[i + 1] === "'") {
      out += "'"
      i += 1
      continue
    }
    out += char
  }
  return out
}

export function transform(input: SqlEscapeInput, options: SqlEscapeOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'unescape') return unescapeSql(input.text, options.type)
  const escaped = escapeSql(input.text, options.type)
  return options.quote ? "'" + escaped + "'" : escaped
}
