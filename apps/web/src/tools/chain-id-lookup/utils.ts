/** 以下内置链数据表原在 chains.ts，为满足源码组织规范 §2（每工具仅 8 个标准文件）内联于此。 */
export interface ChainInfo {
  /** EVM 链为数字 chainId；非 EVM 链为字符串网络标识（如 'solana'） */
  readonly chainId: number | string
  readonly name: string
  readonly symbol: string
  readonly kind: 'EVM' | 'non-EVM'
  readonly testnet: boolean
}

export const CHAINS: readonly ChainInfo[] = [
  { chainId: 1, name: 'Ethereum Mainnet', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 5, name: 'Goerli', symbol: 'ETH', kind: 'EVM', testnet: true },
  { chainId: 10, name: 'Optimism', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 14, name: 'Flare', symbol: 'FLR', kind: 'EVM', testnet: false },
  { chainId: 25, name: 'Cronos', symbol: 'CRO', kind: 'EVM', testnet: false },
  { chainId: 56, name: 'BNB Smart Chain', symbol: 'BNB', kind: 'EVM', testnet: false },
  { chainId: 60, name: 'GoChain', symbol: 'GO', kind: 'EVM', testnet: false },
  { chainId: 97, name: 'BNB Smart Chain Testnet', symbol: 'tBNB', kind: 'EVM', testnet: true },
  { chainId: 100, name: 'Gnosis', symbol: 'xDAI', kind: 'EVM', testnet: false },
  { chainId: 106, name: 'Velas', symbol: 'VLX', kind: 'EVM', testnet: false },
  { chainId: 122, name: 'Fuse', symbol: 'FUSE', kind: 'EVM', testnet: false },
  { chainId: 137, name: 'Polygon', symbol: 'MATIC', kind: 'EVM', testnet: false },
  { chainId: 196, name: 'X Layer', symbol: 'OKB', kind: 'EVM', testnet: false },
  { chainId: 199, name: 'BitTorrent Chain', symbol: 'BTT', kind: 'EVM', testnet: false },
  { chainId: 204, name: 'opBNB', symbol: 'BNB', kind: 'EVM', testnet: false },
  { chainId: 250, name: 'Fantom Opera', symbol: 'FTM', kind: 'EVM', testnet: false },
  { chainId: 288, name: 'Boba Network', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 324, name: 'zkSync Era', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 336, name: 'Shiden', symbol: 'SDN', kind: 'EVM', testnet: false },
  { chainId: 360, name: 'Shape', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 480, name: 'World Chain', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 592, name: 'Astar', symbol: 'ASTR', kind: 'EVM', testnet: false },
  { chainId: 747, name: 'Flow EVM', symbol: 'FLOW', kind: 'EVM', testnet: false },
  { chainId: 1088, name: 'Metis', symbol: 'METIS', kind: 'EVM', testnet: false },
  { chainId: 1101, name: 'Polygon zkEVM', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 1135, name: 'Lisk', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 1284, name: 'Moonbeam', symbol: 'GLMR', kind: 'EVM', testnet: false },
  { chainId: 1285, name: 'Moonriver', symbol: 'MOVR', kind: 'EVM', testnet: false },
  { chainId: 1329, name: 'Sei', symbol: 'SEI', kind: 'EVM', testnet: false },
  { chainId: 1625, name: 'Gravity Alpha', symbol: 'G', kind: 'EVM', testnet: false },
  { chainId: 1868, name: 'Soneium', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 2221, name: 'Kava', symbol: 'KAVA', kind: 'EVM', testnet: false },
  { chainId: 2741, name: 'Abstract', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 5000, name: 'Mantle', symbol: 'MNT', kind: 'EVM', testnet: false },
  { chainId: 5611, name: 'opBNB Testnet', symbol: 'tBNB', kind: 'EVM', testnet: true },
  { chainId: 7000, name: 'ZetaChain', symbol: 'ZETA', kind: 'EVM', testnet: false },
  { chainId: 7001, name: 'ZetaChain Testnet', symbol: 'ZETA', kind: 'EVM', testnet: true },
  { chainId: 7700, name: 'Canto', symbol: 'CANTO', kind: 'EVM', testnet: false },
  { chainId: 8453, name: 'Base', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 9001, name: 'Evmos', symbol: 'EVMOS', kind: 'EVM', testnet: false },
  { chainId: 17000, name: 'Holesky', symbol: 'ETH', kind: 'EVM', testnet: true },
  { chainId: 34443, name: 'Mode', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 42161, name: 'Arbitrum One', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 42220, name: 'Celo', symbol: 'CELO', kind: 'EVM', testnet: false },
  { chainId: 43113, name: 'Avalanche Fuji', symbol: 'AVAX', kind: 'EVM', testnet: true },
  { chainId: 43114, name: 'Avalanche C-Chain', symbol: 'AVAX', kind: 'EVM', testnet: false },
  { chainId: 59144, name: 'Linea', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 80002, name: 'Polygon Amoy', symbol: 'MATIC', kind: 'EVM', testnet: true },
  { chainId: 81457, name: 'Blast', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 84532, name: 'Base Sepolia', symbol: 'ETH', kind: 'EVM', testnet: true },
  { chainId: 167000, name: 'Taiko', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 421614, name: 'Arbitrum Sepolia', symbol: 'ETH', kind: 'EVM', testnet: true },
  { chainId: 534352, name: 'Scroll', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 7777777, name: 'Zora', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 11155111, name: 'Sepolia', symbol: 'ETH', kind: 'EVM', testnet: true },
  { chainId: 11155420, name: 'Optimism Sepolia', symbol: 'ETH', kind: 'EVM', testnet: true },
  { chainId: 1313165254, name: 'Aurora', symbol: 'ETH', kind: 'EVM', testnet: false },
  { chainId: 1666600000, name: 'Harmony', symbol: 'ONE', kind: 'EVM', testnet: false },
  { chainId: 'solana', name: 'Solana', symbol: 'SOL', kind: 'non-EVM', testnet: false },
  { chainId: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', kind: 'non-EVM', testnet: false },
  { chainId: 'tron', name: 'Tron', symbol: 'TRX', kind: 'non-EVM', testnet: false },
  { chainId: 'cosmoshub-4', name: 'Cosmos Hub', symbol: 'ATOM', kind: 'non-EVM', testnet: false },
  { chainId: 'sui', name: 'Sui', symbol: 'SUI', kind: 'non-EVM', testnet: false },
  { chainId: 'aptos', name: 'Aptos', symbol: 'APT', kind: 'non-EVM', testnet: false },
  { chainId: 'near', name: 'Near', symbol: 'NEAR', kind: 'non-EVM', testnet: false },
]

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
