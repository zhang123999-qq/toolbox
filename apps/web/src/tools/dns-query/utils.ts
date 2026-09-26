import type { DnsQueryInput, DnsQueryOptions } from './schema'

const TYPE_NAMES: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
}

const STATUS_TEXT: Record<number, string> = {
  0: 'NOERROR（无错误）',
  1: 'FORMERR（格式错误）',
  2: 'SERVFAIL（服务器失败）',
  3: 'NXDOMAIN（域名不存在）',
  5: 'REFUSED（被拒绝）',
}

/** 校验域名长得像域名 */
export function assertDomain(domain: string): void {
  const trimmed = domain.trim()
  if (trimmed === '') throw new Error('请输入要查询的域名，例如 example.com')
  if (/\s/.test(trimmed)) throw new Error('域名不能包含空白字符')
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed)) {
    throw new Error('域名格式不正确，应为 example.com 形式')
  }
}

interface Answer {
  name?: string
  type?: number
  TTL?: number
  data?: string
}

/** 把 DoH 响应渲染成文本（纯函数，可单测） */
export function renderResponse(json: unknown): string {
  if (typeof json !== 'object' || json === null) throw new Error('返回数据格式异常')
  const body = json as { Status?: number; Answer?: Answer[]; Question?: Answer[] }
  const lines: string[] = []
  const status = body.Status ?? -1
  lines.push(`状态码：${status} ${STATUS_TEXT[status] ?? ''}`)
  if (status === 3) lines.push('该域名不存在（NXDOMAIN）')
  const answers = body.Answer ?? []
  if (answers.length === 0) {
    lines.push('Answer：无记录')
  } else {
    lines.push(`Answer（${answers.length} 条）：`)
    for (const a of answers) {
      const typeName = TYPE_NAMES[a.type ?? 0] ?? String(a.type)
      lines.push(`  ${a.name ?? ''}\tTTL=${a.TTL ?? '?'}\t${typeName}\t${a.data ?? ''}`)
    }
  }
  return lines.join('\n')
}

/** 调 Google DoH 接口查询 */
export async function queryDns(domain: string, type: string): Promise<string> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/dns-json' } })
  } catch (error) {
    throw new Error(
      '网络请求失败：' +
        (error instanceof Error ? error.message : String(error)) +
        '（可能是网络不通或被浏览器 CORS / 广告拦截插件拦截）',
      { cause: error },
    )
  }
  if (!res.ok) throw new Error(`DoH 服务器返回 HTTP ${res.status}`)
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new Error('DoH 返回的不是合法 JSON')
  }
  return renderResponse(json)
}

export async function transform(input: DnsQueryInput, options: DnsQueryOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertDomain(input.text)
  return queryDns(input.text.trim(), options.type)
}
