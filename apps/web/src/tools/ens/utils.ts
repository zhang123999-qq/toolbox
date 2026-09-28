/**
 * #706 ENS 名称解析（utils）
 *
 * - namehash：EIP-137 递归 keccak（简化规范化：trim + lowercase，非完整 UTS-46）
 * - resolveEnsName：registry.resolver(node) → resolver.addr(node) 两次 eth_call
 * - fetch 可注入（默认全局 fetch），超时可配；测试不得真实联网
 * - Keccak-256 为本工具内手写实现，无第三方依赖
 */

/* ---------------- Keccak-256（手写，与 #705 eip712 同构） ---------------- */

const MASK64 = (1n << 64n) - 1n

const RC: readonly bigint[] = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
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

/** Keccak-256 */
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

/* ---------------- 基础 ---------------- */

const te = new TextEncoder()

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/* ---------------- namehash（EIP-137） ---------------- */

const ZERO_NODE = new Uint8Array(32)

/**
 * 简化规范化：去首尾空白 + 转小写。
 * 注意：不是完整的 UTS-46 / IDNA 规范化，大小写域名与特殊字符可能与官方 App 行为不一致。
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * namehash：node = keccak256(node ‖ keccak256(label))，从根向叶迭代。
 * 空名称返回全零 node；空标签（如 "a..eth"）抛错。
 */
export function namehash(name: string): Uint8Array {
  const normalized = normalizeName(name)
  if (normalized === '') return ZERO_NODE.slice()
  let node: Uint8Array = ZERO_NODE.slice()
  const labels = normalized.split('.').reverse()
  for (const label of labels) {
    if (label === '') throw new Error('名称格式错误：存在空标签')
    node = keccak256(concatBytes(node, keccak256(te.encode(label))))
  }
  return node
}

export function namehashHex(name: string): string {
  return bytesToHex(namehash(name))
}

/* ---------------- 链上解析 ---------------- */

/** ENS Registry（主网，多链同地址） */
export const ENS_REGISTRY = '0x00000000000C2CAA39b223FE8D0A0e5C4F27eAD'

/** resolver(bytes32) 选择器 */
const SELECTOR_RESOLVER = '0178b8bf'
/** addr(bytes32) 选择器 */
const SELECTOR_ADDR = '3b3b57de'

const ZERO_ADDRESS = `0x${'00'.repeat(20)}`

/** 可注入的 fetch 类型（默认全局 fetch；测试用 mock，不得真实联网） */
export type FetchFn = (
  url: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'
export const DEFAULT_TIMEOUT_MS = 15000

interface JsonRpcResponse {
  result?: unknown
  error?: { message?: string; code?: number }
}

/**
 * 单次 eth_call。网络异常 / 超时 / HTTP 错误 / JSON-RPC 错误均抛中文错误。
 */
export async function ethCall(
  rpcUrl: string,
  to: string,
  dataHex: string,
  fetchFn: FetchFn = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  if (!/^https?:\/\//.test(rpcUrl)) throw new Error('RPC 地址格式错误：须以 http(s):// 开头')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: { ok: boolean; status: number; json(): Promise<unknown> }
    try {
      response = await fetchFn(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data: dataHex }, 'latest'],
        }),
        signal: controller.signal,
      })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('请求超时：RPC 未在时限内响应', { cause: e })
      }
      throw new Error(`网络请求失败：${e instanceof Error ? e.message : String(e)}`, { cause: e })
    }
    if (!response.ok) throw new Error(`RPC 请求失败：HTTP ${response.status}`)
    const body = (await response.json()) as JsonRpcResponse
    if (body.error) throw new Error(`RPC 错误：${body.error.message ?? `code ${body.error.code}`}`)
    if (typeof body.result !== 'string' || !/^0x[0-9a-fA-F]*$/.test(body.result)) {
      throw new Error('RPC 返回无效：result 不是十六进制字符串')
    }
    return body.result
  } finally {
    clearTimeout(timer)
  }
}

/** 从 32 字节 word 尾部取地址 */
function wordToAddress(word: string): string {
  return `0x${word.slice(-40).toLowerCase()}`
}

export interface EnsResolveResult {
  /** 规范化后的名称 */
  name: string
  /** namehash node（hex，不带 0x） */
  node: string
  /** resolver 合约地址 */
  resolver: string
  /** 解析出的地址 */
  address: string
}

/**
 * ENS 正向解析：registry.resolver(node) → resolver.addr(node)。
 * 两次 eth_call；resolver 未设置 / 地址记录未设置均抛中文错误。
 */
export async function resolveEnsName(
  name: string,
  rpcUrl: string = DEFAULT_RPC_URL,
  fetchFn: FetchFn = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<EnsResolveResult> {
  const normalized = normalizeName(name)
  if (normalized === '') throw new Error('名称不能为空')
  const nodeBytes = namehash(normalized)
  const nodeHex = bytesToHex(nodeBytes)

  const resolverWord = await ethCall(rpcUrl, ENS_REGISTRY, `0x${SELECTOR_RESOLVER}${nodeHex}`, fetchFn, timeoutMs)
  const resolver = wordToAddress(resolverWord)
  if (resolver === ZERO_ADDRESS) throw new Error(`该名称未设置 resolver：${normalized}`)

  const addrWord = await ethCall(rpcUrl, resolver, `0x${SELECTOR_ADDR}${nodeHex}`, fetchFn, timeoutMs)
  const address = wordToAddress(addrWord)
  if (address === ZERO_ADDRESS) throw new Error(`该名称未设置地址记录：${normalized}`)

  return { name: normalized, node: nodeHex, resolver, address }
}
