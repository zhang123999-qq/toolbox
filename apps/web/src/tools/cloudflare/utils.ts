/**
 * cloudflare（#813）核心逻辑：DNS 记录与页面规则的校验、生成。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT'

export const DNS_RECORD_TYPES: readonly DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'TXT']

export interface DnsRecordInput {
  type: string
  name: string
  content: string
  proxied: boolean
  ttl: number
}

export interface DnsRecord {
  type: DnsRecordType
  name: string
  content: string
  proxied: boolean
  ttl: number
}

function isIpv4(s: string): boolean {
  const parts = s.split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => /^\d+$/.test(p) && Number(p) <= 255)
}

/** 组装 DNS 记录；类型 / 名称 / 值 / TTL 非法时中文抛错 */
export function buildDnsRecord(input: DnsRecordInput): DnsRecord {
  if (!DNS_RECORD_TYPES.includes(input.type as DnsRecordType))
    throw new Error(`不支持的记录类型：${input.type}，仅支持 ${DNS_RECORD_TYPES.join(' / ')}`)
  const type = input.type as DnsRecordType
  const name = input.name.trim()
  if (name === '') throw new Error('记录名不能为空')
  const content = input.content.trim()
  if (content === '') throw new Error('记录值不能为空')
  if (type === 'A' && !isIpv4(content)) throw new Error(`A 记录值须为 IPv4 地址：${content}`)
  if (type === 'AAAA' && !content.includes(':'))
    throw new Error(`AAAA 记录值须为 IPv6 地址：${content}`)
  const ttl = input.ttl
  if (!Number.isInteger(ttl) || (ttl !== 1 && ttl < 30))
    throw new Error('TTL 须为 1（自动）或 ≥30 的整数秒')
  return { type, name, content, proxied: input.proxied, ttl }
}

export type CacheLevel = 'basic' | 'simplified' | 'aggressive' | 'bypass'

export const CACHE_LEVELS: readonly CacheLevel[] = ['basic', 'simplified', 'aggressive', 'bypass']

export interface PageRuleInput {
  pattern: string
  cacheLevel: string
  browserTtl: number
}

/** 生成页面规则 JSON（美化缩进）；参数非法时中文抛错 */
export function buildPageRule(input: PageRuleInput): string {
  const pattern = input.pattern.trim()
  if (pattern === '') throw new Error('页面规则匹配模式不能为空')
  if (!CACHE_LEVELS.includes(input.cacheLevel as CacheLevel))
    throw new Error(`不支持的缓存级别：${input.cacheLevel}，仅支持 ${CACHE_LEVELS.join(' / ')}`)
  const browserTtl = input.browserTtl
  if (!Number.isInteger(browserTtl) || browserTtl < 0)
    throw new Error('浏览器缓存 TTL 须为 ≥0 的整数秒')
  const rule = {
    targets: [{ target: 'url', constraint: { operator: 'matches', value: pattern } }],
    actions: [
      { id: 'cache_level', value: input.cacheLevel },
      { id: 'browser_cache_ttl', value: browserTtl },
    ],
    status: 'active',
  }
  return JSON.stringify(rule, null, 2)
}

/**
 * 解析参数文本：每行「key=value」，空行跳过；格式非法行中文抛错。
 * 后出现的同名参数覆盖先前的。
 */
export function parseKvLines(text: string): Record<string, string> {
  const kv: Record<string, string> = {}
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) throw new Error(`第 ${i + 1} 行参数格式非法，应为「key=value」`)
    kv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return kv
}

function parseBooleanFlag(value: string | undefined, field: string): boolean {
  if (value === undefined || value === '') return false
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${field} 须为 true 或 false`)
}

function parseInteger(value: string | undefined, field: string, fallback: number): number {
  if (value === undefined || value === '') return fallback
  if (!/^-?\d+$/.test(value)) throw new Error(`${field} 须为整数`)
  return Number(value)
}

/** 从 key=value 文本构建 DNS 记录输入（含类型转换与校验） */
export function dnsInputFromKv(kv: Record<string, string>): DnsRecordInput {
  return {
    type: (kv['type'] ?? '').trim().toUpperCase(),
    name: kv['name'] ?? '',
    content: kv['content'] ?? '',
    proxied: parseBooleanFlag(kv['proxied'], 'proxied'),
    ttl: parseInteger(kv['ttl'], 'ttl', 1),
  }
}

/** 从 key=value 文本构建页面规则输入（含类型转换与校验） */
export function pageRuleInputFromKv(kv: Record<string, string>): PageRuleInput {
  return {
    pattern: kv['pattern'] ?? '',
    cacheLevel: (kv['cacheLevel'] ?? 'basic').trim(),
    browserTtl: parseInteger(kv['browserTtl'], 'browserTtl', 0),
  }
}

export const EXAMPLE_DNS_KV = [
  '# DNS 记录参数，每行 key=value',
  'type=A',
  'name=www',
  'content=203.0.113.10',
  'ttl=300',
  'proxied=true',
].join('\n')

export const EXAMPLE_PAGE_RULE_KV = [
  '# 页面规则参数，每行 key=value',
  'pattern=example.com/static/*',
  'cacheLevel=aggressive',
  'browserTtl=86400',
].join('\n')
