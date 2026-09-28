import { CHAINS, type ChainInfo } from './chains'

/** 数字 chainId 转 0x 十六进制 */
export function chainIdToHex(id: number): string {
  if (!Number.isSafeInteger(id) || id < 0) throw new Error(`链 ID 非法：${id}`)
  return '0x' + id.toString(16)
}

/**
 * 按查询串查找链。
 * - `0x…` 十六进制 → 精确匹配数字 chainId
 * - 纯数字 → 精确匹配数字 chainId
 * - 其他 → 名称包含（大小写不敏感）或代币符号精确（大小写不敏感）匹配
 * 未找到抛中文错。
 */
export function lookupChain(query: string): ChainInfo[] {
  const q = query.trim()
  if (q === '') throw new Error('请输入链 ID（十进制 / 0x 十六进制）、链名称或代币符号')

  if (/^0x[0-9a-fA-F]+$/.test(q)) {
    const id = Number.parseInt(q, 16)
    const hits = CHAINS.filter((c) => c.chainId === id)
    if (hits.length === 0) throw new Error(`未找到链 ID 为 ${q} 的链`)
    return hits
  }

  if (/^\d+$/.test(q)) {
    const id = Number.parseInt(q, 10)
    const hits = CHAINS.filter((c) => c.chainId === id)
    if (hits.length === 0) throw new Error(`未找到链 ID 为 ${q} 的链`)
    return hits
  }

  const lower = q.toLowerCase()
  const hits = CHAINS.filter(
    (c) => c.name.toLowerCase().includes(lower) || c.symbol.toLowerCase() === lower,
  )
  if (hits.length === 0) throw new Error(`未找到与“${q}”匹配的链`)
  return hits
}

/** 单条链信息格式化为多行文本 */
export function formatChainInfo(c: ChainInfo): string {
  const lines = [
    `名称：${c.name}${c.testnet ? '（测试网）' : ''}`,
    `链 ID：${c.chainId}`,
  ]
  if (typeof c.chainId === 'number') lines.push(`十六进制：${chainIdToHex(c.chainId)}`)
  lines.push(`代币符号：${c.symbol}`, `类型：${c.kind === 'EVM' ? 'EVM 兼容链' : '非 EVM 链'}`)
  return lines.join('\n')
}

/** 多条结果合并输出 */
export function formatResults(hits: ChainInfo[]): string {
  return hits.map(formatChainInfo).join('\n\n---\n\n')
}
