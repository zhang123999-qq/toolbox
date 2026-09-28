/**
 * 合约 ABI 解析：ABI JSON → 函数 / 事件接口浏览，选择器与事件主题计算。
 * 纯前端实现（手写 Keccak-256），不依赖外部库、不联网。
 */

/* ---------------- Keccak-256（与 tx-decode 同源实现） ---------------- */

const KECCAK_ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]
const KECCAK_ROTATION_OFFSETS = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
]
const KECCAK_MASK = (1n << 64n) - 1n

function rotl64(x: bigint, n: number): bigint {
  if (n === 0) return x
  return ((x << BigInt(n)) | (x >> BigInt(64 - n))) & KECCAK_MASK
}

function keccakF1600(state: bigint[]): void {
  for (let round = 0; round < 24; round += 1) {
    const c: bigint[] = []
    for (let x = 0; x < 5; x += 1) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
    }
    const d: bigint[] = []
    for (let x = 0; x < 5; x += 1) {
      d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1)
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        state[x + 5 * y] ^= d[x]
      }
    }
    const b = new Array<bigint>(25).fill(0n)
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        const idx = KECCAK_ROTATION_OFFSETS[x + 5 * y]
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(state[x + 5 * y], idx)
      }
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        state[x + 5 * y] = b[x + 5 * y] ^ (~b[(x + 1) % 5 + 5 * y] & b[(x + 2) % 5 + 5 * y])
      }
    }
    state[0] ^= KECCAK_ROUND_CONSTANTS[round]
  }
}

/** Keccak-256（以太坊版，非 NIST SHA3） */
export function keccak256(data: Uint8Array): Uint8Array {
  const state = new Array<bigint>(25).fill(0n)
  const blockSize = 136
  let offset = 0
  while (offset + blockSize <= data.length) {
    for (let i = 0; i < blockSize / 8; i += 1) {
      let lane = 0n
      for (let j = 0; j < 8; j += 1) {
        lane |= BigInt(data[offset + i * 8 + j]) << BigInt(8 * j)
      }
      state[i] ^= lane
    }
    keccakF1600(state)
    offset += blockSize
  }
  const last = new Uint8Array(blockSize)
  last.set(data.slice(offset))
  last[data.length - offset] = 0x01
  last[blockSize - 1] |= 0x80
  for (let i = 0; i < blockSize / 8; i += 1) {
    let lane = 0n
    for (let j = 0; j < 8; j += 1) {
      lane |= BigInt(last[i * 8 + j]) << BigInt(8 * j)
    }
    state[i] ^= lane
  }
  keccakF1600(state)
  const out = new Uint8Array(32)
  for (let i = 0; i < 4; i += 1) {
    const lane = state[i]
    for (let j = 0; j < 8; j += 1) {
      out[i * 8 + j] = Number((lane >> BigInt(8 * j)) & 0xffn)
    }
  }
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

/* ---------------- ABI 解析 ---------------- */

export interface AbiParam {
  readonly name: string
  readonly type: string
  readonly components?: AbiParam[]
}

export interface AbiEntry {
  readonly type: string
  readonly name?: string
  readonly inputs?: AbiParam[]
  readonly stateMutability?: string
}

export interface AbiItem {
  readonly kind: 'function' | 'event'
  readonly name: string
  readonly signature: string
  readonly hash: string
  readonly mutability: string
  readonly inputs: string
}

/** 解析 ABI JSON 文本，返回条目数组（格式非法抛中文错） */
export function parseAbi(text: string): AbiEntry[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('ABI 不是合法 JSON')
  }
  if (!Array.isArray(parsed)) throw new Error('ABI 应为 JSON 数组')
  if (parsed.length === 0) throw new Error('ABI 数组为空')
  return parsed.map((e, i) => {
    if (e === null || typeof e !== 'object') throw new Error(`ABI 第 ${i + 1} 项不是对象`)
    const entry = e as Record<string, unknown>
    if (typeof entry.type !== 'string') throw new Error(`ABI 第 ${i + 1} 项缺少 type 字段`)
    return entry as unknown as AbiEntry
  })
}

/** 参数类型规范化（tuple 展开 components） */
function canonicalType(param: AbiParam): string {
  if (param.type.startsWith('tuple')) {
    const suffix = param.type.slice('tuple'.length) // '' 或 '[]' / '[3]' 等
    const inner = (param.components ?? []).map(canonicalType).join(',')
    return `(${inner})${suffix}`
  }
  return param.type
}

/** 规范签名：name(type1,type2,…) */
export function canonicalSignature(entry: AbiEntry): string {
  if (!entry.name) throw new Error('函数 / 事件缺少 name 字段')
  const types = (entry.inputs ?? []).map(canonicalType).join(',')
  return `${entry.name}(${types})`
}

/** 4 字节函数选择器（0x 前缀） */
export function functionSelector(signature: string): string {
  return '0x' + bytesToHex(keccak256(new TextEncoder().encode(signature)).slice(0, 4))
}

/** 事件主题哈希（0x 前缀，32 字节） */
export function eventTopic(signature: string): string {
  return '0x' + bytesToHex(keccak256(new TextEncoder().encode(signature)))
}

/** ABI → 可浏览条目（仅 function / event） */
export function abiToItems(abi: AbiEntry[]): AbiItem[] {
  const items: AbiItem[] = []
  for (const entry of abi) {
    if (entry.type !== 'function' && entry.type !== 'event') continue
    const signature = canonicalSignature(entry) // 缺 name 时已抛错，此处 name 必为 string
    items.push({
      kind: entry.type,
      name: entry.name as string,
      signature,
      hash: entry.type === 'function' ? functionSelector(signature) : eventTopic(signature),
      mutability: entry.stateMutability ?? '-',
      inputs: (entry.inputs ?? []).map((p) => `${canonicalType(p)} ${p.name}`.trim()).join(', ') || '无参数',
    })
  }
  return items
}

/** 按名称 / 签名关键字过滤 */
export function filterItems(items: AbiItem[], keyword: string): AbiItem[] {
  const kw = keyword.trim().toLowerCase()
  if (kw === '') return items
  return items.filter((it) => it.name.toLowerCase().includes(kw) || it.signature.toLowerCase().includes(kw))
}
