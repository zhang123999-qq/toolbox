import type { ConnectionParserInput, ConnectionParserOptions } from './schema'

export interface ParsedConnection {
  scheme: string
  user: string
  password: string
  host: string
  port: string
  dbname: string
  params: Record<string, string>
}

/** 解析数据库连接串 URL；非法时抛中文错误 */
export function parseConnection(raw: string): ParsedConnection {
  const input = raw.trim().replace(/;+$/, '')
  if (input === '') throw new Error('请输入连接串')

  let url: URL
  try {
    // sqlite:///path 这种没有 host，URL 也能解析
    url = new URL(input)
  } catch {
    throw new Error(
      '无法解析连接串：请确认是 scheme:// 开头的 URL，如 mysql://user:pass@host:3306/db',
    )
  }

  const scheme = url.protocol.replace(/:$/, '')
  if (!['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'].includes(scheme)) {
    throw new Error(`不支持的 scheme：${scheme}（支持 mysql/postgresql/mongodb/redis/sqlite）`)
  }

  const params: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    params[k] = v
  })

  return {
    scheme,
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    host: url.hostname || '',
    port: url.port || '',
    dbname: decodeURIComponent(url.pathname.replace(/^\//, '')),
    params,
  }
}

export function render(c: ParsedConnection): string {
  const lines: string[] = []
  lines.push('连接串解析结果：')
  lines.push(`  类型（scheme）：${c.scheme}`)
  lines.push(`  host：${c.host || '(无)'}`)
  lines.push(`  port：${c.port || '(默认)'}`)
  lines.push(`  user：${c.user || '(无)'}`)
  lines.push(`  password：${c.password ? '******（已填写）' : '(无)'}`)
  lines.push(`  dbname：${c.dbname || '(无)'}`)
  if (Object.keys(c.params).length > 0) {
    lines.push('  参数：')
    for (const [k, v] of Object.entries(c.params)) lines.push(`    ${k} = ${v}`)
  } else {
    lines.push('  参数：(无)')
  }
  return lines.join('\n')
}

export function transform(input: ConnectionParserInput, _options: ConnectionParserOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 5000) throw new Error('输入超过 5,000 字符上限')
  return render(parseConnection(input.text))
}
