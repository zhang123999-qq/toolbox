import type { ShortUrlInput, ShortUrlOptions } from './schema'

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** FNV-1a 32 位哈希，确定性、零依赖 */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    // 等价于 hash * 16777619（JS 位运算按 32 位有符号）
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** 把 32 位整数编码成 base62 字符串 */
export function toBase62(num: number, length: number): string {
  let n = num
  let out = ''
  while (n > 0) {
    out = BASE62[n % 62] + out
    n = Math.floor(n / 62)
  }
  return out.padStart(length, '0').slice(-length)
}

/** 由长 URL 派生短码（取 hash 的前 8 位 base62） */
export function shortCode(longUrl: string): string {
  return toBase62(fnv1a(longUrl), 8)
}

export function buildDemo(longUrl: string, baseUrl: string): string {
  if (!/^https?:\/\//.test(longUrl.trim())) {
    throw new Error('请输入以 http:// 或 https:// 开头的完整 URL')
  }
  const code = shortCode(longUrl.trim())
  const base = baseUrl.trim().replace(/\/$/, '') || 'https://s.example.com'
  const nginxHost = base.replace('https://', '').replace('http://', '')

  return [
    '# 短码（本地演示，不真起服务）',
    `长 URL：${longUrl.trim()}`,
    `短码：${code}`,
    `完整短链示例：${base}/${code}`,
    '',
    '# 自建短链方案 1：Nginx rewrite（需维护一张 code → url 映射表）',
    '```nginx',
    'map $uri $redirect_target {',
    `    default "https://example.com/404";`,
    `    "/${code}" "${longUrl.trim()}";`,
    '    # 其余短码按同样格式追加…',
    '}',
    'server {',
    '    listen 443 ssl;',
    `    server_name ${nginxHost};`,
    '    return 301 $redirect_target;',
    '}',
    '```',
    '',
    '# 自建短链方案 2：Cloudflare Worker（KV 存映射）',
    '```js',
    "const DATABASE = 'SHORT_LINKS'",
    'export default {',
    '  async fetch(request, env) {',
    '    const url = new URL(request.url)',
    `    const target = await env[DATABASE].get(url.pathname.slice(1))`,
    '    if (target) return Response.redirect(target, 301)',
    '    return new Response("Not Found", { status: 404 })',
    '  },',
    '}',
    '```',
    '',
    '# 备注',
    '- 这只是「内容 hash → 短码」的演示：同一长 URL 永远得到同一短码，无中心化发码',
    '- 真短链服务需要一个 KV / 数据库存 code → url，并防碰撞（hash 仅 32 位，约 10 亿空间）',
  ].join('\n')
}

export function transform(input: ShortUrlInput, options: ShortUrlOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 2000) throw new Error('输入超过 2,000 字符上限')
  return buildDemo(input.text, options.baseUrl)
}
