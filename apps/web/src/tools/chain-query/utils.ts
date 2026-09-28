import type { ChainQueryInput, ChainQueryOptions } from './schema'

/**
 * chain-query（#701）工具函数：
 * 链上查询——地址余额 / 交易 / 区块，经公共 JSON-RPC 只读查询。
 * 网络层 fetch 可注入，测试全 mock。纯函数（除 rpc 外），便于单测。
 */

/** 默认公共 RPC（以太坊主网） */
export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'

export const KIND_OPTIONS = ['余额查询', '交易查询', '区块查询'] as const

export type ChainQueryKind = (typeof KIND_OPTIONS)[number]

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

/**
 * JSON-RPC 2.0 调用：POST + AbortController 超时，所有失败转为中文错误。
 * fetch 可注入；测试中全部 mock，不发真实网络请求。
 */
export async function rpcCall(
  url: string,
  method: string,
  params: unknown[],
  fetchFn: FetchFn = fetch,
  timeoutMs = 15000,
): Promise<unknown> {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入 RPC 地址')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('RPC 地址须以 http:// 或 https:// 开头')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetchFn(trimmed, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `请求超时（${Math.round(timeoutMs / 1000)} 秒）：RPC 节点无响应，请稍后重试或更换 RPC 地址`,
        { cause: error },
      )
    }
    throw new Error(
      '网络请求失败：' +
        (error instanceof Error ? error.message : String(error)) +
        '（可能是网络不通、浏览器 CORS 限制或节点限流）',
      { cause: error },
    )
  }
  clearTimeout(timer)
  if (!res.ok) throw new Error(`RPC 服务器返回 HTTP ${res.status}`)
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new Error('RPC 返回的不是合法 JSON')
  }
  if (typeof json !== 'object' || json === null) throw new Error('RPC 返回数据格式异常')
  const body = json as { result?: unknown; error?: { code?: number; message?: string } | null }
  if (body.error !== undefined && body.error !== null) {
    const code = typeof body.error.code === 'number' ? ` ${body.error.code}` : ''
    throw new Error(`RPC 返回错误${code}：${body.error.message ?? '未知错误'}`)
  }
  return body.result
}

/** 0x hex 数量 → bigint（格式错误抛中文错） */
export function hexToBigInt(hex: string): bigint {
  const h = hex.trim()
  if (!/^0[xX][0-9a-fA-F]+$/.test(h)) throw new Error(`数量 hex 格式错误：${hex}`)
  return BigInt(h)
}

/** decimals 精度格式化（去尾零） */
function formatScaled(raw: bigint, decimals: number): string {
  const s = raw.toString(10).padStart(decimals + 1, '0')
  const intPart = s.slice(0, s.length - decimals)
  const fracPart = s.slice(s.length - decimals).replace(/0+$/, '')
  return fracPart === '' ? intPart : `${intPart}.${fracPart}`
}

/** 校验 0x 地址格式（40 位 hex） */
export function assertAddress(input: string): string {
  const t = input.trim()
  if (!/^0[xX][0-9a-fA-F]{40}$/.test(t)) {
    throw new Error('地址格式错误：应为 0x 开头的 40 位十六进制字符')
  }
  return t
}

/** 校验交易哈希格式（0x + 64 位 hex） */
export function assertTxHash(input: string): string {
  const t = input.trim()
  if (!/^0[xX][0-9a-fA-F]{64}$/.test(t)) {
    throw new Error('交易哈希格式错误：应为 0x 开头的 64 位十六进制字符')
  }
  return t
}

/** 解析区块号输入：latest / 十进制 / 0x hex → RPC 可用的块标签 */
export function parseBlockTag(input: string): string {
  const t = input.trim().toLowerCase()
  if (t === '') throw new Error('请输入区块号（latest、十进制或 0x hex）')
  if (t === 'latest' || t === 'earliest' || t === 'pending') return t
  if (/^\d+$/.test(t)) return `0x${BigInt(t).toString(16)}`
  if (/^0x[0-9a-f]+$/.test(t)) return t
  throw new Error('区块号格式错误：须为 latest、十进制或 0x hex')
}

export interface QueryPayload {
  method: string
  params: unknown[]
}

/** 按查询类型构造 RPC 参数 */
export function buildQueryPayload(kind: string, input: string): QueryPayload {
  switch (kind) {
    case '余额查询':
      return { method: 'eth_getBalance', params: [assertAddress(input), 'latest'] }
    case '交易查询':
      return { method: 'eth_getTransactionByHash', params: [assertTxHash(input)] }
    case '区块查询':
      return { method: 'eth_getBlockByNumber', params: [parseBlockTag(input), false] }
    default:
      throw new Error(`未知查询类型：${kind}`)
  }
}

/** 余额结果渲染 */
export function formatBalance(result: unknown): string {
  if (typeof result !== 'string') throw new Error('eth_getBalance 返回格式异常')
  const wei = hexToBigInt(result)
  return [
    `余额：${formatScaled(wei, 18)} ETH`,
    `    = ${formatScaled(wei, 9)} gwei`,
    `    = ${wei.toString(10)} wei`,
  ].join('\n')
}

interface RpcTx {
  hash?: string
  blockNumber?: string | null
  transactionIndex?: string | null
  from?: string
  to?: string | null
  value?: string
  nonce?: string
  gasPrice?: string
  maxFeePerGas?: string
  gas?: string
  input?: string
}

/** 交易结果渲染（null 表示未找到） */
export function formatTransaction(result: unknown): string {
  if (result === null || result === undefined) {
    throw new Error('未找到该交易（可能尚未上链或哈希错误）')
  }
  if (typeof result !== 'object') throw new Error('eth_getTransactionByHash 返回格式异常')
  const tx = result as RpcTx
  const data = tx.input ?? '0x'
  const dataPreview =
    data.length > 68 ? `${data.slice(0, 66)}…（共 ${(data.length - 2) / 2} 字节）` : data
  const feePrice = tx.gasPrice ?? tx.maxFeePerGas ?? '0x0'
  const lines = [
    `交易哈希：${tx.hash ?? '未知'}`,
    `状态：${tx.blockNumber == null ? '待打包（不在区块中）' : `已上链（区块 ${hexToBigInt(tx.blockNumber).toString(10)}）`}`,
    `发送方：${tx.from ?? '未知'}`,
    `接收方：${tx.to ?? '合约创建'}`,
    `金额：${formatScaled(hexToBigInt(tx.value ?? '0x0'), 18)} ETH`,
    `Nonce：${hexToBigInt(tx.nonce ?? '0x0').toString(10)}`,
    `Gas Price：${formatScaled(hexToBigInt(feePrice), 9)} gwei`,
    `Gas Limit：${hexToBigInt(tx.gas ?? '0x0').toString(10)}`,
    `输入数据：${dataPreview}`,
  ]
  return lines.join('\n')
}

interface RpcBlock {
  number?: string
  hash?: string
  parentHash?: string
  timestamp?: string
  miner?: string
  gasLimit?: string
  gasUsed?: string
  transactions?: unknown[]
}

/** 区块结果渲染（null 表示未找到） */
export function formatBlock(result: unknown): string {
  if (result === null || result === undefined) {
    throw new Error('未找到该区块（可能尚未产生或区块号错误）')
  }
  if (typeof result !== 'object') throw new Error('eth_getBlockByNumber 返回格式异常')
  const b = result as RpcBlock
  const ts = Number(hexToBigInt(b.timestamp ?? '0x0'))
  const txs = Array.isArray(b.transactions) ? b.transactions.length : 0
  return [
    `区块高度：${hexToBigInt(b.number ?? '0x0').toString(10)}`,
    `区块哈希：${b.hash ?? '未知'}`,
    `时间：${new Date(ts * 1000).toISOString()}（unix ${ts}）`,
    `矿工/出块方：${b.miner ?? '未知'}`,
    `交易数：${txs}`,
    `Gas Used：${hexToBigInt(b.gasUsed ?? '0x0').toString(10)}`,
    `Gas Limit：${hexToBigInt(b.gasLimit ?? '0x0').toString(10)}`,
    `父哈希：${b.parentHash ?? '未知'}`,
  ].join('\n')
}

export async function transform(
  input: ChainQueryInput,
  options: ChainQueryOptions,
): Promise<string> {
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  if (input.text.trim() === '') throw new Error('请输入查询内容（地址 / 交易哈希 / 区块号）')
  const kind = options.kind as ChainQueryKind
  const payload = buildQueryPayload(kind, input.text)
  const url = options.rpcUrl.trim() === '' ? DEFAULT_RPC_URL : options.rpcUrl.trim()
  const result = await rpcCall(url, payload.method, payload.params)
  // kind 已被 buildQueryPayload 校验，只能是三种之一
  if (kind === '余额查询') return formatBalance(result)
  if (kind === '交易查询') return formatTransaction(result)
  return formatBlock(result)
}
