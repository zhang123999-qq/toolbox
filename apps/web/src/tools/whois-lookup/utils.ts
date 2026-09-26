import type { WhoisLookupInput, WhoisLookupOptions } from './schema'

const MAX_INPUT = 200_000

/** 常见 TLD → whois 服务器速查 */
const WHOIS_SERVERS: Record<string, string> = {
  com: 'whois.verisign-grs.com',
  net: 'whois.verisign-grs.com',
  org: 'whois.publicinterestregistry.org',
  info: 'whois.afilias.net',
  cn: 'whois.cnnic.cn',
  'com.cn': 'whois.cnnic.cn',
  'net.cn': 'whois.cnnic.cn',
  'org.cn': 'whois.cnnic.cn',
  'gov.cn': 'whois.cnnic.cn',
  io: 'whois.nic.io',
  dev: 'whois.nic.google',
  app: 'whois.nic.google',
  co: 'whois.nic.co',
  me: 'whois.nic.me',
  uk: 'whois.nic.uk',
  'co.uk': 'whois.nic.uk',
  au: 'whois.auda.org.au',
  'com.au': 'whois.auda.org.au',
  jp: 'whois.jprs.jp',
  xyz: 'whois.nic.xyz',
}

/** 已知的二级后缀（需要把 a.com.cn 整体当后缀） */
const TWO_PART_TLDS = new Set([
  'com.cn',
  'net.cn',
  'org.cn',
  'gov.cn',
  'edu.cn',
  'co.uk',
  'org.uk',
  'me.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'ne.jp',
  'com.hk',
  'com.tw',
])

/** 规范化并解析域名，返回本地信息（纯函数） */
export function localInfo(domain: string): {
  normalized: string
  labels: string[]
  tld: string
  registeredDomain: string
  whoisServer: string
} {
  const normalized = domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
  if (normalized === '') throw new Error('请输入要查询的域名，例如 example.com')
  if (/\s/.test(normalized)) throw new Error('域名不能包含空白字符')
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) {
    throw new Error('域名格式不正确，应为 example.com 形式')
  }
  const labels = normalized.split('.')
  const lastTwo = labels.slice(-2).join('.')
  let tld: string
  let registeredDomain: string
  if (TWO_PART_TLDS.has(lastTwo)) {
    tld = lastTwo
    registeredDomain = labels.slice(-3).join('.')
  } else {
    tld = labels[labels.length - 1]
    registeredDomain = labels.slice(-2).join('.')
  }
  const whoisServer =
    WHOIS_SERVERS[tld] ?? WHOIS_SERVERS[registeredDomain] ?? '未知（请按 TLD 查注册局）'
  return { normalized, labels, tld, registeredDomain, whoisServer }
}

/** 本地信息渲染 */
function renderLocal(info: ReturnType<typeof localInfo>): string {
  return [
    `规范域名：${info.normalized}`,
    `注册域名：${info.registeredDomain}`,
    `后缀（TLD）：${info.tld}`,
    `标签：${info.labels.join(' . ')}`,
    `Whois 服务器：${info.whoisServer}`,
    `命令行查询：whois -h ${info.whoisServer} ${info.registeredDomain}`,
    `RDAP 地址：https://rdap.org/domain/${info.registeredDomain}`,
  ].join('\n')
}

/** 尝试 RDAP 查询；失败不抛错，只返回说明 */
async function tryRdap(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: 'application/rdap+json' },
    })
    if (!res.ok) return `RDAP：HTTP ${res.status}，未能获取注册数据`
    const json = (await res.json()) as {
      registrar?: { name?: string }
      events?: Array<{ eventAction?: string; eventDate?: string }>
    }
    const lines = ['RDAP 注册信息：']
    if (json.registrar?.name) lines.push(`  注册商：${json.registrar.name}`)
    for (const ev of json.events ?? []) {
      if (ev.eventAction && ev.eventDate) lines.push(`  ${ev.eventAction}：${ev.eventDate}`)
    }
    return lines.join('\n')
  } catch (error) {
    return (
      'RDAP：浏览器跨域请求失败（' +
      (error instanceof Error ? error.message : String(error)) +
      '），仅展示本地解析；可用上面的 whois 命令行或 RDAP 地址手动查询'
    )
  }
}

export async function transform(
  input: WhoisLookupInput,
  _options: WhoisLookupOptions,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const info = localInfo(input.text)
  const rdap = await tryRdap(info.registeredDomain)
  return [renderLocal(info), '', rdap].join('\n')
}
