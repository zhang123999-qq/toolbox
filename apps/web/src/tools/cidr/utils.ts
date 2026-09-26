import type { CidrInput, CidrOptions } from './schema'

/** 把 4 段点分十进制解析成无符号 32 位整数 */
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

/** 无符号 32 位整数 → 点分十进制 */
export function formatIPv4(bin: number): string {
  return [(bin >>> 24) & 255, (bin >>> 16) & 255, (bin >>> 8) & 255, bin & 255].join('.')
}

/** 32 位整数 → 点分 8 位二进制（便于看掩码） */
export function formatIPv4Binary(bin: number): string {
  return [24, 16, 8, 0]
    .map((shift) => ((bin >>> shift) & 255).toString(2).padStart(8, '0'))
    .join('.')
}

export interface CidrResult {
  network: number
  broadcast: number
  mask: number
  prefix: number
  total: number
  first: number
  last: number
}

/** 解析并计算 CIDR */
export function computeCidr(cidr: string): CidrResult {
  const m = cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/)
  if (!m) throw new Error('CIDR 格式应为 1.2.3.4/24：' + cidr)
  const ip = parseIPv4(m[1])
  const prefix = m[2] === undefined ? 32 : Number(m[2])
  if (prefix < 0 || prefix > 32) throw new Error('前缀长度须在 0-32：' + prefix)

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = (ip & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = Math.pow(2, 32 - prefix)

  // 可用主机数：/31 与 /32 特殊，其余减去网络号与广播地址
  let first = network
  let last = broadcast
  if (prefix <= 30) {
    first = (network + 1) >>> 0
    last = (broadcast - 1) >>> 0
  }
  return { network, broadcast, mask, prefix, total, first, last }
}

/** T2 同步入口 */
export function transform(input: CidrInput, _options: CidrOptions): string {
  const cidr = input.text.trim()
  if (cidr === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const r = computeCidr(cidr)
  const usable = r.prefix <= 30 ? r.total - 2 : r.total
  return [
    `CIDR：${formatIPv4(r.network)}/${r.prefix}`,
    `子网掩码：${formatIPv4(r.mask)}`,
    `网络地址：${formatIPv4(r.network)}`,
    `广播地址：${formatIPv4(r.broadcast)}`,
    `可用主机范围：${formatIPv4(r.first)} ~ ${formatIPv4(r.last)}`,
    `地址总数：${r.total}`,
    `可用主机数：${usable}`,
    `网络地址二进制：${formatIPv4Binary(r.network)}`,
    `子网掩码二进制：${formatIPv4Binary(r.mask)}`,
  ].join('\n')
}
