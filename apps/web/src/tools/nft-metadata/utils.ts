import type { NftMetadataInput, NftMetadataOptions } from './schema'

/**
 * nft-metadata（#698）工具函数：
 * eth_call 调 tokenURI(uint256) → 解析 data:base64 / ipfs:// / https 元数据 → 文本展示。
 * Keccak-256 与 address-validate/abi-codec 同构（手写，不引入新依赖）。
 * 网络层 fetch 可注入，测试全 mock。
 */

/* ---------------- Keccak-256（与 #691/#694/#695 同构） ---------------- */

const MASK64 = (1n << 64n) - 1n

const RC: readonly bigint[] = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
]

const ROT: readonly number[] = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
]

function rotl64(value: bigint, shift: number): bigint {
  const s = BigInt(shift)
  return ((value << s) | (value >> (64n - s))) & MASK64
}

function keccakF(a: bigint[]): void {
  const c = new Array<bigint>(5)
  const b = new Array<bigint>(25)
  for (let round = 0; round < 24; round += 1) {
    for (let x = 0; x < 5; x += 1) {
      c[x] = a[x] ^ a[x + 5] ^ a[x + 10] ^ a[x + 15] ^ a[x + 20]
    }
    for (let x = 0; x < 5; x += 1) {
      const d = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1)
      for (let y = 0; y < 5; y += 1) a[x + 5 * y] ^= d
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(a[x + 5 * y], ROT[x + 5 * y])
      }
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        const i = x + 5 * y
        a[i] = (b[i] ^ (~b[((x + 1) % 5) + 5 * y] & b[((x + 2) % 5) + 5 * y])) & MASK64
      }
    }
    a[0] ^= RC[round]
  }
}

export function keccak256(bytes: Uint8Array): Uint8Array {
  const rate = 136
  const state = new Array<bigint>(25).fill(0n)
  const padLength = rate - (bytes.length % rate)
  const padded = new Uint8Array(bytes.length + padLength)
  padded.set(bytes)
  padded[bytes.length] = 0x01
  padded[bytes.length + padLength - 1] |= 0x80
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i += 1) {
      const lane = i >> 3
      state[lane] ^= BigInt(padded[offset + i]) << BigInt((i & 7) * 8)
    }
    keccakF(state)
  }
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i += 1) {
    out[i] = Number((state[i >> 3] >> BigInt((i & 7) * 8)) & 0xffn)
  }
  return out
}

/** 字节数组转小写 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** hex（可带 0x）→ 字节数组 */
export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex
  if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) {
    throw new Error('hex 格式错误：须为偶数位十六进制字符')
  }
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** tokenURI(uint256) 函数选择器（知名值 0xc87b56dd，此处由 keccak 计算得出） */
export const TOKEN_URI_SELECTOR = `0x${bytesToHex(keccak256(new TextEncoder().encode('tokenURI(uint256)'))).slice(0, 8)}`

/* ---------------- RPC ---------------- */

/** 默认公共 RPC（以太坊主网） */
export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'

/** ipfs 网关 */
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

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

/* ---------------- tokenURI 编解码 ---------------- */

/** 校验合约地址格式 */
export function assertAddress(input: string): string {
  const t = input.trim()
  if (!/^0[xX][0-9a-fA-F]{40}$/.test(t)) {
    throw new Error('合约地址格式错误：应为 0x 开头的 40 位十六进制字符')
  }
  return t
}

/** 解析 tokenId（非负整数） */
export function parseTokenId(input: string): bigint {
  const t = input.trim()
  if (t === '') throw new Error('请输入 tokenId')
  if (!/^\d+$/.test(t)) throw new Error('tokenId 格式错误：须为非负整数')
  return BigInt(t)
}

/** bigint → 32 字节大端 hex（不带 0x） */
export function encodeUint256(n: bigint): string {
  if (n < 0n || n >= 1n << 256n) throw new Error('tokenId 超出 uint256 范围')
  return n.toString(16).padStart(64, '0')
}

/** 从 32 字节字读 bigint */
function wordToBigint(bytes: Uint8Array, offset: number): bigint {
  let v = 0n
  for (let i = 0; i < 32; i += 1) v = (v << 8n) | BigInt(bytes[offset + i])
  return v
}

/** 解码 eth_call 返回的 ABI string（tokenURI） */
export function decodeAbiString(dataHex: string): string {
  const h = dataHex.trim().toLowerCase()
  if (!/^0x[0-9a-f]*$/.test(h) || h.length % 2 !== 0) {
    throw new Error('eth_call 返回数据格式错误')
  }
  const bytes = hexToBytes(h)
  if (bytes.length < 64) throw new Error('eth_call 返回数据过短')
  const offset = wordToBigint(bytes, 0)
  if (offset !== 32n) throw new Error('tokenURI 返回偏移异常（非标准 ABI 编码）')
  const len = wordToBigint(bytes, 32)
  if (len > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('元数据长度超出安全范围')
  const start = 64
  const end = start + Number(len)
  if (end > bytes.length) throw new Error('eth_call 返回数据长度不足')
  return new TextDecoder().decode(bytes.slice(start, end))
}

export type ResolvedTokenUri = { kind: 'inline'; json: unknown } | { kind: 'url'; url: string }

/** 解析 tokenURI：data:base64 内联 / ipfs:// / https */
export function resolveTokenUri(uri: string): ResolvedTokenUri {
  const t = uri.trim()
  if (t === '') throw new Error('tokenURI 为空')
  const base64Prefix = 'data:application/json;base64,'
  if (t.startsWith(base64Prefix)) {
    const b64 = t.slice(base64Prefix.length)
    let bin: string
    try {
      bin = atob(b64)
    } catch {
      throw new Error('tokenURI 的 base64 数据非法')
    }
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const text = new TextDecoder().decode(bytes)
    try {
      return { kind: 'inline', json: JSON.parse(text) }
    } catch {
      throw new Error('tokenURI 内联 JSON 解析失败')
    }
  }
  if (t.startsWith('data:'))
    throw new Error('不支持的 tokenURI data 格式（仅支持 data:application/json;base64）')
  if (t.startsWith('ipfs://')) {
    const path = t.slice('ipfs://'.length)
    if (path === '') throw new Error('ipfs URI 路径为空')
    return { kind: 'url', url: `${IPFS_GATEWAY}${path}` }
  }
  if (/^https?:\/\//i.test(t)) return { kind: 'url', url: t }
  throw new Error('tokenURI 格式不支持（须为 https/http/ipfs/data:application/json;base64）')
}

/** GET 拉取元数据 JSON（超时 + 中文错误） */
export async function fetchMetadataJson(
  url: string,
  fetchFn: FetchFn = fetch,
  timeoutMs = 15000,
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetchFn(url, { signal: controller.signal })
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`元数据请求超时（${Math.round(timeoutMs / 1000)} 秒）`, { cause: error })
    }
    throw new Error('元数据请求失败：' + (error instanceof Error ? error.message : String(error)), {
      cause: error,
    })
  }
  clearTimeout(timer)
  if (!res.ok) throw new Error(`元数据请求返回 HTTP ${res.status}`)
  try {
    return await res.json()
  } catch {
    throw new Error('元数据不是合法 JSON')
  }
}

/** 图片 URL 归一化（ipfs → 网关） */
function resolveImageUrl(image: unknown): string {
  if (typeof image !== 'string' || image.trim() === '') return '无'
  const t = image.trim()
  if (t.startsWith('ipfs://')) return `${IPFS_GATEWAY}${t.slice('ipfs://'.length)}`
  return t
}

/** 元数据渲染为文本 */
export function renderMetadata(meta: unknown): string {
  if (typeof meta !== 'object' || meta === null) throw new Error('元数据不是合法 JSON 对象')
  const m = meta as {
    name?: unknown
    description?: unknown
    image?: unknown
    external_url?: unknown
    attributes?: unknown
  }
  const lines = [
    `名称：${typeof m.name === 'string' ? m.name : '未知'}`,
    `描述：${typeof m.description === 'string' ? m.description : '无'}`,
    `图片：${resolveImageUrl(m.image)}`,
  ]
  if (typeof m.external_url === 'string' && m.external_url.trim() !== '') {
    lines.push(`外部链接：${m.external_url.trim()}`)
  }
  if (Array.isArray(m.attributes) && m.attributes.length > 0) {
    lines.push(`属性（${m.attributes.length} 项）：`)
    for (const a of m.attributes) {
      if (typeof a === 'object' && a !== null) {
        const trait = a as { trait_type?: unknown; value?: unknown }
        lines.push(`  ${String(trait.trait_type ?? '未知')}：${String(trait.value ?? '未知')}`)
      } else {
        lines.push(`  ${String(a)}`)
      }
    }
  } else {
    lines.push('属性：无')
  }
  return lines.join('\n')
}

export async function transform(
  input: NftMetadataInput,
  options: NftMetadataOptions,
): Promise<string> {
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const tokenId = parseTokenId(input.text)
  const contract = assertAddress(options.contract)
  const url = options.rpcUrl.trim() === '' ? DEFAULT_RPC_URL : options.rpcUrl.trim()
  const data = `${TOKEN_URI_SELECTOR}${encodeUint256(tokenId)}`
  const result = await rpcCall(url, 'eth_call', [{ to: contract, data }, 'latest'])
  if (typeof result !== 'string') throw new Error('eth_call 返回格式异常')
  const tokenUri = decodeAbiString(result)
  const resolved = resolveTokenUri(tokenUri)
  const metadata =
    resolved.kind === 'inline' ? resolved.json : await fetchMetadataJson(resolved.url)
  return renderMetadata(metadata)
}
