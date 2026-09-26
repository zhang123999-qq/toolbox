import type { IpLookupInput, IpLookupOptions } from './schema'

// ---------------------------------------------------------------------------
// IPv4
// ---------------------------------------------------------------------------

/** 解析 IPv4 为无符号 32 位整数；非法抛中文错误 */
export function parseIPv4(s: string): number {
  const parts = s.split('.')
  if (parts.length !== 4) throw new Error('IPv4 须为 4 段：' + s)
  let bin = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) throw new Error('IPv4 段须为数字：' + p)
    const n = Number(p)
    if (n < 0 || n > 255) throw new Error('IPv4 段须在 0-255：' + p)
    bin = (bin * 256 + n) >>> 0
  }
  return bin >>> 0
}

function inV4(bin: number, base: string, prefix: number): boolean {
  const baseBin = parseIPv4(base)
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (bin & mask) >>> 0 === baseBin
}

function classifyV4(bin: number): string {
  if (bin === 0xffffffff) return '受限广播地址'
  if (inV4(bin, '127.0.0.0', 8)) return '环回地址（Loopback）'
  if (inV4(bin, '10.0.0.0', 8)) return '私网地址（10/8）'
  if (inV4(bin, '172.16.0.0', 12)) return '私网地址（172.16/12）'
  if (inV4(bin, '192.168.0.0', 16)) return '私网地址（192.168/16）'
  if (inV4(bin, '169.254.0.0', 16)) return '链路本地地址（APIPA）'
  if (inV4(bin, '224.0.0.0', 4)) return '组播地址（Multicast）'
  if (inV4(bin, '240.0.0.0', 4)) return '保留地址（E 类）'
  return '公网地址'
}

// ---------------------------------------------------------------------------
// IPv6
// ---------------------------------------------------------------------------

/** 展开 `::`，返回 8 个 16 位组（BigInt 便于 128 位运算） */
export function parseIPv6(s: string): bigint[] {
  const scoped = s.includes('%') ? s.slice(0, s.indexOf('%')) : s
  const dbl = scoped.split('::')
  if (dbl.length > 2) throw new Error('IPv6 只能有一个 :: 压缩：' + s)
  const splitGroup = (g: string): string[] => (g === '' ? [] : g.split(':'))
  const head = splitGroup(dbl[0])
  const tail = dbl.length === 2 ? splitGroup(dbl[1]) : []
  if (head.length + tail.length > 8) throw new Error('IPv6 组数超过 8：' + s)
  const groups: bigint[] = []
  for (const g of head) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error('IPv6 组非法：' + g)
    groups.push(BigInt(parseInt(g, 16)))
  }
  if (dbl.length === 2) {
    for (let i = 0; i < 8 - head.length - tail.length; i++) groups.push(0n)
  }
  for (const g of tail) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error('IPv6 组非法：' + g)
    groups.push(BigInt(parseInt(g, 16)))
  }
  if (groups.length !== 8) throw new Error('IPv6 须为 8 组：' + s)
  return groups
}

function ipv6ToBigInt(groups: bigint[]): bigint {
  let v = 0n
  for (const g of groups) v = (v << 16n) | g
  return v
}

function classifyV6(groups: bigint[]): string {
  const v = ipv6ToBigInt(groups)
  if (v === 1n) return '环回地址（::1）'
  if (v === 0n) return '未指定地址（::）'
  const hi = groups[0]
  // 组播 ff00::/8：首字节 ff
  if ((hi & 0xff00n) === 0xff00n) return '组播地址（Multicast）'
  // 链路本地 fe80::/10：首组 fe80-febf
  if ((hi & 0xffc0n) === 0xfe80n) return '链路本地地址（fe80::/10）'
  // 唯一本地 fc00::/7：首组 fc00-fdff
  if ((hi & 0xfe00n) === 0xfc00n) return '唯一本地地址（fc00::/7）'
  return '公网地址'
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

function isIPv6(s: string): boolean {
  return s.includes(':')
}

function renderV4(bin: number): string {
  const octets = [(bin >>> 24) & 255, (bin >>> 16) & 255, (bin >>> 8) & 255, bin & 255]
  return [
    `格式：IPv4`,
    `点分十进制：${octets.join('.')}`,
    `分类：${classifyV4(bin)}`,
    `二进制：${octets.map((o) => o.toString(2).padStart(8, '0')).join('.')}`,
    `十六进制：0x${bin.toString(16).toUpperCase().padStart(8, '0')}`,
    `整数表示：${bin}`,
  ].join('\n')
}

function renderV6(groups: bigint[]): string {
  const v = ipv6ToBigInt(groups)
  const canonical = groups.map((g) => g.toString(16)).join(':')
  return [
    `格式：IPv6`,
    `规范化：${canonical}`,
    `分类：${classifyV6(groups)}`,
    `二进制：${groups.map((g) => g.toString(2).padStart(16, '0')).join(':')}`,
    `整数表示：${v.toString()}`,
  ].join('\n')
}

/** T2 同步入口 */
export function transform(input: IpLookupInput, _options: IpLookupOptions): string {
  const s = input.text.trim()
  if (s === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  if (isIPv6(s)) return renderV6(parseIPv6(s))
  return renderV4(parseIPv4(s))
}
