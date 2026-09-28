import type { GasInput, GasOptions } from './schema'

/**
 * gas（#700）工具函数：
 * Gas 计算——实时 eth_gasPrice 查询（公共 RPC）+ Gas Price × Gas Limit 手动计算。
 * 金额全部 BigInt 精确计算。网络层 fetch 可注入，测试全 mock。全部纯函数（除 rpc 外）。
 */

/** 默认公共 RPC（以太坊主网） */
export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'

export const MODE_OPTIONS = ['计算器', '实时查询'] as const

/** 常用 Gas Limit 预设 */
export const GAS_LIMIT_PRESETS = [
  '手动输入',
  '转账 21000',
  'ERC20 转账 65000',
  'NFT 铸造 150000',
  '合约交互 200000',
] as const

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

/** 十进制 gwei 字符串 → wei（最多 9 位小数） */
export function parseGweiToWei(value: string): bigint {
  const v = value.trim().replace(/,/g, '')
  if (v === '') throw new Error('请输入 Gas Price（gwei）')
  const m = /^(\d+)(?:\.(\d+))?$/.exec(v)
  if (!m) throw new Error('Gas Price 格式错误：须为非负十进制数')
  const frac = m[2] ?? ''
  if (frac.length > 9) throw new Error('Gas Price 小数位数过多（gwei 最多 9 位小数）')
  return BigInt(m[1]) * 10n ** 9n + BigInt(frac.padEnd(9, '0'))
}

/** 解析 Gas Limit（正整数） */
export function parseGasLimit(value: string): bigint {
  const v = value.trim().replace(/,/g, '')
  if (v === '') throw new Error('请输入 Gas Limit')
  if (!/^\d+$/.test(v)) throw new Error('Gas Limit 格式错误：须为正整数')
  const n = BigInt(v)
  if (n === 0n) throw new Error('Gas Limit 须大于 0')
  return n
}

export interface GasFee {
  wei: string
  gwei: string
  ether: string
}

/** Gas 费 = priceWei × gasLimit，三种单位输出 */
export function calcGasFee(priceWei: bigint, gasLimit: bigint): GasFee {
  const feeWei = priceWei * gasLimit
  return {
    wei: feeWei.toString(10),
    gwei: formatScaled(feeWei, 9),
    ether: formatScaled(feeWei, 18),
  }
}

/** 从预设名提取 Gas Limit；"手动输入" 返回 null */
export function presetGasLimit(preset: string): bigint | null {
  const m = /(\d+)$/.exec(preset.trim())
  if (preset === '手动输入' || !m) return null
  return BigInt(m[1])
}

/** 实时查询当前 Gas Price（gwei 字符串） */
export async function getGasPrice(
  url: string,
  fetchFn: FetchFn = fetch,
  timeoutMs = 15000,
): Promise<string> {
  const result = await rpcCall(url, 'eth_gasPrice', [], fetchFn, timeoutMs)
  if (typeof result !== 'string') throw new Error('eth_gasPrice 返回格式异常')
  return formatScaled(hexToBigInt(result), 9)
}

export async function transform(input: GasInput, options: GasOptions): Promise<string> {
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  if (options.mode === '实时查询') {
    const url = options.rpcUrl.trim() === '' ? DEFAULT_RPC_URL : options.rpcUrl.trim()
    const price = await getGasPrice(url)
    return [`当前 Gas Price：${price} gwei`, `数据来源：${url}（eth_gasPrice，以太坊主网）`].join(
      '\n',
    )
  }
  const priceWei = parseGweiToWei(input.text)
  const preset = presetGasLimit(options.preset)
  const gasLimit = preset ?? parseGasLimit(options.gasLimit)
  const fee = calcGasFee(priceWei, gasLimit)
  return [
    `Gas Price：${formatScaled(priceWei, 9)} gwei`,
    `Gas Limit：${gasLimit.toString(10)}`,
    `总费用：${fee.ether} ETH`,
    `      = ${fee.gwei} gwei`,
    `      = ${fee.wei} wei`,
  ].join('\n')
}
