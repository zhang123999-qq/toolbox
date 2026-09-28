import type { ContractSimInput, ContractSimOptions } from './schema'

/**
 * contract-sim（#697）工具函数：
 * 解析 ABI → 计算函数选择器 → ABI 编码参数 → eth_call 只读模拟 → 解码返回值。
 * Keccak-256 与 address-validate/abi-codec 同构（手写，不引入新依赖）。
 * 网络层 fetch 可注入，测试全 mock。
 */

/* ---------------- Keccak-256（与 #691/#694/#695/#698 同构） ---------------- */

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

/** bigint → 32 字节大端字（导出以便单元测试边界） */
export function bigintToWord(v: bigint): Uint8Array {
  if (v < 0n || v >= 1n << 256n) throw new Error('数值超出 uint256 范围')
  const out = new Uint8Array(32)
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

/** 安全读取 32 字节字（越界抛中文错；调用方保证 offset ≥ 0） */
function readWord(bytes: Uint8Array, offset: number): Uint8Array {
  if (offset + 32 > bytes.length) throw new Error('eth_call 返回数据长度不足')
  return bytes.slice(offset, offset + 32)
}

function wordToBigint(word: Uint8Array): bigint {
  let v = 0n
  for (let i = 0; i < 32; i += 1) v = (v << 8n) | BigInt(word[i])
  return v
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/* ---------------- RPC ---------------- */

/** 默认公共 RPC（以太坊主网） */
export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'

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

/* ---------------- ABI 解析 ---------------- */

export interface AbiParam {
  name: string
  type: string
}

export interface AbiFunction {
  name: string
  inputs: AbiParam[]
  outputs: AbiParam[]
  stateMutability: string
}

function normalizeParams(v: unknown, label: string): AbiParam[] {
  if (v === undefined) return []
  if (!Array.isArray(v)) throw new Error(`ABI 方法的 ${label} 须为数组`)
  return v.map((p, i) => {
    if (typeof p !== 'object' || p === null || typeof (p as { type?: unknown }).type !== 'string') {
      throw new Error(`ABI 方法的 ${label}[${i}] 缺少 type`)
    }
    const q = p as { type: string; name?: unknown }
    return { name: typeof q.name === 'string' ? q.name : '', type: q.type }
  })
}

/** 解析 ABI JSON，提取所有 function */
export function parseAbi(abiText: string): AbiFunction[] {
  const t = abiText.trim()
  if (t === '') throw new Error('请输入 ABI')
  let parsed: unknown
  try {
    parsed = JSON.parse(t)
  } catch {
    throw new Error('ABI 不是合法 JSON')
  }
  if (!Array.isArray(parsed)) throw new Error('ABI 须为 JSON 数组')
  const fns: AbiFunction[] = []
  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      (item as { type?: unknown }).type === 'function'
    ) {
      const f = item as {
        name?: unknown
        inputs?: unknown
        outputs?: unknown
        stateMutability?: unknown
      }
      if (typeof f.name !== 'string' || f.name === '') throw new Error('ABI 中存在无名 function')
      fns.push({
        name: f.name,
        inputs: normalizeParams(f.inputs, 'inputs'),
        outputs: normalizeParams(f.outputs, 'outputs'),
        stateMutability: typeof f.stateMutability === 'string' ? f.stateMutability : '',
      })
    }
  }
  return fns
}

/** 按名查找方法（重载抛错，要求精确匹配） */
export function findFunction(fns: AbiFunction[], name: string): AbiFunction {
  const n = name.trim()
  if (n === '') throw new Error('请输入方法名')
  const matches = fns.filter((f) => f.name === n)
  if (matches.length === 0) throw new Error(`ABI 中未找到方法：${n}`)
  if (matches.length > 1) throw new Error(`方法 ${n} 存在 ${matches.length} 个重载，暂不支持重载`)
  return matches[0]
}

/** 函数选择器：keccak(name(type1,type2)) 前 4 字节 */
export function functionSelector(name: string, types: string[]): string {
  const sig = `${name}(${types.join(',')})`
  return `0x${bytesToHex(keccak256(new TextEncoder().encode(sig))).slice(0, 8)}`
}

/* ---------------- ABI 编码 ---------------- */

/** 校验合约地址格式 */
export function assertAddress(input: string): string {
  const t = input.trim()
  if (!/^0[xX][0-9a-fA-F]{40}$/.test(t)) {
    throw new Error('合约地址格式错误：应为 0x 开头的 40 位十六进制字符')
  }
  return t
}

function isDynamicType(type: string): boolean {
  return type === 'string' || type === 'bytes' || type.endsWith('[]')
}

function parseUintBits(type: string): number {
  const m = /^uint(\d*)$/.exec(type)
  if (!m) throw new Error(`暂不支持的参数类型：${type}`)
  const bits = m[1] === '' ? 256 : Number(m[1])
  if (bits < 8 || bits > 256 || bits % 8 !== 0) throw new Error(`非法 uint 位宽：${type}`)
  return bits
}

function parseIntBits(type: string): number {
  const m = /^int(\d*)$/.exec(type)
  if (!m) throw new Error(`暂不支持的参数类型：${type}`)
  const bits = m[1] === '' ? 256 : Number(m[1])
  if (bits < 8 || bits > 256 || bits % 8 !== 0) throw new Error(`非法 int 位宽：${type}`)
  return bits
}

/** 参数值 → bigint（接受 number/decimal string/bigint） */
function toBigintValue(value: unknown, label: string): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new Error(`${label}：number 须为安全范围内的整数，超大值请用字符串`)
    }
    return BigInt(value)
  }
  if (typeof value === 'string') {
    const t = value.trim()
    if (!/^-?\d+$/.test(t)) throw new Error(`${label}：须为十进制整数字符串`)
    return BigInt(t)
  }
  throw new Error(`${label}：须为整数（number/字符串/bigint）`)
}

/** 静态类型 → 32 字节字 */
export function encodeStatic(type: string, value: unknown): Uint8Array {
  const label = `参数（${type}）`
  if (type.startsWith('uint')) {
    const bits = parseUintBits(type)
    const v = toBigintValue(value, label)
    if (v < 0n || v >= 1n << BigInt(bits)) throw new Error(`${label}：超出 ${type} 范围`)
    return bigintToWord(v)
  }
  if (type.startsWith('int')) {
    const bits = parseIntBits(type)
    const v = toBigintValue(value, label)
    const min = -(1n << BigInt(bits - 1))
    const max = 1n << BigInt(bits - 1)
    if (v < min || v >= max) throw new Error(`${label}：超出 ${type} 范围`)
    // ABI：有符号整数按 256 位符号扩展编码
    return bigintToWord(v < 0n ? (1n << 256n) + v : v)
  }
  if (type === 'address') {
    if (typeof value !== 'string' || !/^0[xX][0-9a-fA-F]{40}$/.test(value.trim())) {
      throw new Error(`${label}：须为 0x 开头的 40 位十六进制地址`)
    }
    const word = new Uint8Array(32)
    word.set(hexToBytes(value.trim()), 12)
    return word
  }
  if (type === 'bool') {
    if (typeof value !== 'boolean') throw new Error(`${label}：须为 true/false`)
    const word = new Uint8Array(32)
    word[31] = value ? 1 : 0
    return word
  }
  const bytesN = /^bytes(\d+)$/.exec(type)
  if (bytesN) {
    const n = Number(bytesN[1])
    if (n < 1 || n > 32) throw new Error(`${label}：bytesN 的 N 须在 1..32`)
    if (typeof value !== 'string' || !/^0[xX][0-9a-fA-F]+$/.test(value.trim())) {
      throw new Error(`${label}：须为 0x 开头的十六进制字符串`)
    }
    const raw = hexToBytes(value.trim())
    if (raw.length !== n) throw new Error(`${label}：长度须为 ${n} 字节，实际 ${raw.length} 字节`)
    const word = new Uint8Array(32)
    word.set(raw, 0)
    return word
  }
  throw new Error(`暂不支持的参数类型：${type}（如 tuple 请自行编码）`)
}

/** 动态类型 → 原始内容字节（长度与填充由调用方处理） */
export function encodeDynamic(type: string, value: unknown): Uint8Array {
  const label = `参数（${type}）`
  if (type === 'string') {
    if (typeof value !== 'string') throw new Error(`${label}：须为字符串`)
    return new TextEncoder().encode(value)
  }
  if (type === 'bytes') {
    if (typeof value !== 'string' || !/^0[xX][0-9a-fA-F]*$/.test(value.trim())) {
      throw new Error(`${label}：须为 0x 开头的十六进制字符串`)
    }
    return hexToBytes(value.trim())
  }
  throw new Error(`暂不支持的参数类型：${type}（数组/tuple 请自行编码）`)
}

/** 参数列表 → ABI 编码 hex（不带 0x） */
export function encodeArgs(types: string[], values: unknown[]): string {
  if (types.length !== values.length) {
    throw new Error(`参数数量不匹配：方法需要 ${types.length} 个，实际 ${values.length} 个`)
  }
  const heads: Uint8Array[] = []
  const tails: Uint8Array[] = []
  let dynOffset = types.length * 32
  for (let i = 0; i < types.length; i += 1) {
    if (isDynamicType(types[i])) {
      heads.push(bigintToWord(BigInt(dynOffset)))
      const content = encodeDynamic(types[i], values[i])
      const tail = concat(bigintToWord(BigInt(content.length)), content)
      const paddedLen = Math.ceil(tail.length / 32) * 32
      const padded = new Uint8Array(paddedLen)
      padded.set(tail)
      tails.push(padded)
      dynOffset += padded.length
    } else {
      heads.push(encodeStatic(types[i], values[i]))
    }
  }
  return bytesToHex(concat(...heads, ...tails))
}

/* ---------------- ABI 解码 ---------------- */

function formatDecodedValue(type: string, word: Uint8Array): string {
  if (type.startsWith('uint')) {
    return wordToBigint(word).toString(10)
  }
  if (type.startsWith('int')) {
    parseIntBits(type) // 仅校验位宽合法
    // ABI：有符号整数按 256 位符号扩展编码，看最高位判负
    const v = wordToBigint(word)
    return (v >= 1n << 255n ? v - (1n << 256n) : v).toString(10)
  }
  if (type === 'address') {
    return `0x${bytesToHex(word.slice(12))}`
  }
  if (type === 'bool') {
    return word[31] === 0 ? 'false' : 'true'
  }
  const bytesN = /^bytes(\d+)$/.exec(type)
  if (bytesN) {
    return `0x${bytesToHex(word.slice(0, Number(bytesN[1])))}`
  }
  if (type === 'string') {
    return new TextDecoder().decode(word)
  }
  if (type === 'bytes') {
    return `0x${bytesToHex(word)}`
  }
  return `0x${bytesToHex(word)}（类型 ${type} 按原样展示）`
}

/** 解码 eth_call 返回的 outputs */
export function decodeOutputs(outputs: AbiParam[], dataHex: string): string {
  if (outputs.length === 0) return '（无返回值）'
  const h = dataHex.trim().toLowerCase()
  if (!/^0x[0-9a-f]*$/.test(h) || h.length % 2 !== 0) throw new Error('eth_call 返回数据格式错误')
  const bytes = hexToBytes(h)
  if (bytes.length === 0) throw new Error('eth_call 返回为空：方法可能 revert，或选择器无匹配')
  const parts: string[] = []
  for (let i = 0; i < outputs.length; i += 1) {
    const t = outputs[i].type
    const name = outputs[i].name === '' ? `#${i}` : outputs[i].name
    if (isDynamicType(t)) {
      const off = Number(wordToBigint(readWord(bytes, i * 32)))
      const len = Number(wordToBigint(readWord(bytes, off)))
      const content = bytes.slice(off + 32, off + 32 + len)
      parts.push(`${name} = ${formatDecodedValue(t, content)}`)
    } else {
      parts.push(`${name} = ${formatDecodedValue(t, readWord(bytes, i * 32))}`)
    }
  }
  return parts.join('\n')
}

export async function transform(
  input: ContractSimInput,
  options: ContractSimOptions,
): Promise<string> {
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const contract = assertAddress(options.contract)
  const fns = parseAbi(options.abi)
  const fn = findFunction(fns, options.method)
  const t = input.text.trim()
  let params: unknown
  try {
    params = t === '' ? [] : JSON.parse(t)
  } catch {
    throw new Error('参数不是合法 JSON（应为数组，如 ["0xabc...", 100]）')
  }
  if (!Array.isArray(params)) throw new Error('参数须为 JSON 数组')
  const types = fn.inputs.map((p) => p.type)
  const data = `0x${functionSelector(fn.name, types).slice(2)}${encodeArgs(types, params)}`
  const url = options.rpcUrl.trim() === '' ? DEFAULT_RPC_URL : options.rpcUrl.trim()
  const result = await rpcCall(url, 'eth_call', [{ to: contract, data }, 'latest'])
  if (typeof result !== 'string') throw new Error('eth_call 返回格式异常')
  const decoded = decodeOutputs(fn.outputs, result)
  const lines = [`方法：${fn.name}(${types.join(', ')})`, `调用数据：${data}`]
  if (fn.stateMutability !== '' && fn.stateMutability !== 'view' && fn.stateMutability !== 'pure') {
    lines.push('注意：该方法非 view/pure，eth_call 仅在本地节点做只读模拟执行，不会真正上链')
  }
  lines.push('返回：')
  lines.push(decoded)
  return lines.join('\n')
}
