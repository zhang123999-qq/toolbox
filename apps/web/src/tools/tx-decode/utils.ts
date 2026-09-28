/**
 * 以太坊交易解码：RLP 解码 + Legacy / EIP-2930 / EIP-1559 交易字段解析。
 * 纯前端实现（手写 RLP 与 Keccak-256），不依赖外部库、不联网。
 */

/* ---------------- hex / bytes ---------------- */

/** 0x hex → 字节数组（格式非法抛错） */
export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex
  if (h.length === 0) throw new Error('hex 输入为空')
  if (h.length % 2 !== 0) throw new Error('hex 长度须为偶数')
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new Error('hex 含非法字符')
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** 字节数组 → 小写 hex（不带 0x） */
export function bytesToHex(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

/* ---------------- Keccak-256 ---------------- */

const KECCAK_ROUND_CONSTANTS = [
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
        state[x + 5 * y] = b[x + 5 * y] ^ (~b[((x + 1) % 5) + 5 * y] & b[((x + 2) % 5) + 5 * y])
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

/** EIP-55 地址校验和（输入 40 位小写 hex，不带 0x） */
export function toChecksumAddress(lower40: string): string {
  const hash = bytesToHex(keccak256(new TextEncoder().encode(lower40)))
  let out = '0x'
  for (let i = 0; i < 40; i += 1) {
    out += parseInt(hash[i], 16) >= 8 ? lower40[i].toUpperCase() : lower40[i]
  }
  return out
}

/* ---------------- RLP 解码 ---------------- */

/** RLP 值：字节串或嵌套列表 */
export type RlpValue = Uint8Array | RlpValue[]

/** 是否为 RLP 字节串（类型谓词） */
export function isRlpBytes(v: RlpValue): v is Uint8Array {
  return v instanceof Uint8Array
}

/** 读取多字节大端长度（前导零 / 过短抛错），返回 [长度, 新偏移] */
function readRlpLength(data: Uint8Array, pos: number, lenOfLen: number): [number, number] {
  if (pos + lenOfLen > data.length) throw new Error('RLP 截断：长度字节不足')
  if (data[pos] === 0) throw new Error('非规范 RLP：长度前导零')
  let length = 0
  for (let i = 0; i < lenOfLen; i += 1) {
    length = length * 256 + data[pos + i]
    if (length > 0xffffff) throw new Error('RLP 长度超出支持范围')
  }
  return [length, pos + lenOfLen]
}

/** 解码单个 RLP 项，返回 [值, 下一项偏移]；非规范编码抛错 */
function decodeItem(data: Uint8Array, pos: number): [RlpValue, number] {
  // 调用方保证 pos < data.length（rlpDecode 拒绝空输入，decodeListPayload 约束 cursor < end ≤ length）
  const b = data[pos]
  if (b < 0x80) {
    // 单字节（值 < 0x80 直接为自身）
    return [data.slice(pos, pos + 1), pos + 1]
  }
  if (b < 0xb8) {
    // 短字符串：0–55 字节
    const len = b - 0x80
    if (len === 1 && data[pos + 1] < 0x80) {
      throw new Error('非规范 RLP：单字节不应使用字符串包装')
    }
    if (pos + 1 + len > data.length) throw new Error('RLP 截断：字符串载荷不足')
    return [data.slice(pos + 1, pos + 1 + len), pos + 1 + len]
  }
  if (b < 0xc0) {
    // 长字符串：长度超过 55 字节
    const lenOfLen = b - 0xb7
    const [len, start] = readRlpLength(data, pos + 1, lenOfLen)
    if (len <= 55) throw new Error('非规范 RLP：短字符串不应使用长格式')
    if (start + len > data.length) throw new Error('RLP 截断：字符串载荷不足')
    return [data.slice(start, start + len), start + len]
  }
  if (b < 0xf8) {
    // 短列表：载荷 0–55 字节
    const len = b - 0xc0
    return decodeListPayload(data, pos + 1, len)
  }
  // 长列表：载荷超过 55 字节
  const lenOfLen = b - 0xf7
  const [len, start] = readRlpLength(data, pos + 1, lenOfLen)
  if (len <= 55) throw new Error('非规范 RLP：短列表不应使用长格式')
  return decodeListPayload(data, start, len)
}

/** 解码列表载荷 [start, start+len)，返回 [列表, 结束偏移] */
function decodeListPayload(data: Uint8Array, start: number, len: number): [RlpValue[], number] {
  const end = start + len
  if (end > data.length) throw new Error('RLP 截断：列表载荷不足')
  const items: RlpValue[] = []
  let cursor = start
  while (cursor < end) {
    const [item, next] = decodeItem(data, cursor)
    if (next > end) throw new Error('非规范 RLP：子项超出列表载荷边界')
    items.push(item)
    cursor = next
  }
  return [items, end]
}

/** 解码顶层 RLP（必须恰好消费全部字节） */
export function rlpDecode(data: Uint8Array): RlpValue {
  if (data.length === 0) throw new Error('RLP 输入为空')
  const [value, next] = decodeItem(data, 0)
  if (next !== data.length) throw new Error('RLP 尾部有多余字节')
  return value
}

/* ---------------- RLP 值转换 ---------------- */

/** RLP 字节串 → BigInt（整数前导零抛错；空串为 0；单字节 0x00 是非规范零值） */
export function rlpToBigInt(b: Uint8Array, field: string): bigint {
  if (b.length === 0) return 0n
  if (b.length === 1 && b[0] === 0) throw new Error(`非规范 RLP：${field} 整数零值应为空串`)
  if (b.length > 1 && b[0] === 0) throw new Error(`非规范 RLP：${field} 整数前导零`)
  let n = 0n
  for (const byte of b) n = (n << 8n) | BigInt(byte)
  return n
}

/** RLP 字节串 → 0x hex（空串为 0x） */
function rlpToHex(b: Uint8Array): string {
  return `0x${bytesToHex(b)}`
}

/** 断言 RLP 值为字节串 */
function expectBytes(v: RlpValue, field: string): Uint8Array {
  if (!isRlpBytes(v)) throw new Error(`${field} 须为字节串，实际为列表`)
  return v
}

/** 地址字段 → EIP-55（空串表示合约创建） */
export function formatAddress(b: Uint8Array, field: string): string {
  if (b.length === 0) return ''
  if (b.length !== 20) throw new Error(`${field} 长度非法：期望 20 字节，实际 ${b.length}`)
  return toChecksumAddress(bytesToHex(b))
}

/** 数据字段 → hex；可打印 ASCII 时附带文本 */
export function formatData(b: Uint8Array): string {
  const hex = rlpToHex(b)
  if (b.length === 0 || b.length > 64) return hex
  let printable = true
  for (const byte of b) {
    if (byte < 0x20 || byte > 0x7e) {
      printable = false
      break
    }
  }
  if (!printable) return hex
  return `${hex} ("${new TextDecoder().decode(b)}")`
}

/* ---------------- 交易结构 ---------------- */

export interface TxField {
  /** 字段键 */
  key: string
  /** 中文标签 */
  label: string
  /** 主显示值 */
  value: string
  /** 次显示值（hex 等） */
  sub?: string
}

export interface DecodedTx {
  /** 0 = legacy，1 = EIP-2930，2 = EIP-1559 */
  txType: number
  /** 类型中文名 */
  typeLabel: string
  /** 交易哈希（0x hex） */
  hash: string
  /** chainId（十进制字符串；legacy 未启用 EIP-155 时为 null） */
  chainId: string | null
  /** 有序展示字段 */
  fields: TxField[]
}

function numField(key: string, label: string, b: Uint8Array, field: string): TxField {
  const n = rlpToBigInt(b, field)
  return { key, label, value: n.toString(10), sub: rlpToHex(b) }
}

function sigFields(r: Uint8Array, s: Uint8Array): TxField[] {
  return [
    { key: 'r', label: 'r', value: rlpToHex(r) },
    { key: 's', label: 's', value: rlpToHex(s) },
  ]
}

/** accessList → [{address, storageKeys}]（JSON 字符串） */
export function decodeAccessList(v: RlpValue): string {
  if (!Array.isArray(v)) throw new Error('accessList 须为列表')
  const out: { address: string; storageKeys: string[] }[] = []
  for (const entry of v) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error('accessList 条目须为 [address, storageKeys]')
    }
    const addr = expectBytes(entry[0], 'accessList.address')
    if (addr.length !== 20) throw new Error('accessList.address 须为 20 字节')
    const keys = entry[1]
    if (!Array.isArray(keys)) throw new Error('accessList.storageKeys 须为列表')
    out.push({
      address: toChecksumAddress(bytesToHex(addr)),
      storageKeys: keys.map((k) => {
        const kb = expectBytes(k, 'accessList.storageKey')
        if (kb.length !== 32) throw new Error('accessList.storageKey 须为 32 字节')
        return rlpToHex(kb)
      }),
    })
  }
  return JSON.stringify(out)
}

/** legacy v → {chainId, 显示文本} */
export function parseLegacyV(
  v: bigint,
  rEmpty: boolean,
  sEmpty: boolean,
): { chainId: string | null; text: string } {
  if (rEmpty && sEmpty) {
    // 待签名交易：v 即 chainId
    return { chainId: v.toString(10), text: `${v}（待签名，v 即 chainId）` }
  }
  if (v === 27n || v === 28n) {
    return { chainId: null, text: `${v}（未启用 EIP-155）` }
  }
  if (v >= 35n) {
    const cid = (v - 35n) / 2n
    return { chainId: cid.toString(10), text: `${v}（EIP-155，yParity=${(v - 35n) % 2n}）` }
  }
  throw new Error(`v 值非法：${v}（期望 27/28 或 ≥35）`)
}

function decodeLegacy(txBytes: Uint8Array, payload: RlpValue): DecodedTx {
  // 调用方已保证首字节 ≥ 0xc0，RLP 顶层必为列表
  const list = payload as RlpValue[]
  if (list.length !== 9) {
    throw new Error(`Legacy 交易字段数量非法：期望 9，实际 ${list.length}`)
  }
  const [nonceB, gasPriceB, gasB, toB, valueB, dataB, vB, rB, sB] = list.map((p, i) =>
    expectBytes(p, ['nonce', 'gasPrice', 'gasLimit', 'to', 'value', 'data', 'v', 'r', 's'][i]),
  )
  const v = rlpToBigInt(vB, 'v')
  const rEmpty = rB.length === 0
  const sEmpty = sB.length === 0
  const { chainId, text: vText } = parseLegacyV(v, rEmpty, sEmpty)
  const to = formatAddress(toB, 'to')
  const fields: TxField[] = [
    { key: 'type', label: '交易类型', value: 'Legacy' },
    { key: 'hash', label: '交易哈希', value: `0x${bytesToHex(keccak256(txBytes))}` },
  ]
  if (chainId !== null) fields.push({ key: 'chainId', label: 'chainId', value: chainId })
  fields.push(
    numField('nonce', 'nonce', nonceB, 'nonce'),
    numField('gasPrice', 'gasPrice (wei)', gasPriceB, 'gasPrice'),
    numField('gasLimit', 'gasLimit', gasB, 'gasLimit'),
    { key: 'to', label: 'to', value: to === '' ? '（合约创建）' : to },
    numField('value', 'value (wei)', valueB, 'value'),
    { key: 'data', label: 'data', value: formatData(dataB) },
    { key: 'v', label: 'v', value: vText },
    ...sigFields(rB, sB),
  )
  return {
    txType: 0,
    typeLabel: 'Legacy',
    hash: `0x${bytesToHex(keccak256(txBytes))}`,
    chainId,
    fields,
  }
}

/**
 * 解码 EIP-2930 (type 1) / EIP-1559 (type 2)。
 * type1: [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, yParity, r, s]
 * type2: [chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList, yParity, r, s]
 */
function decodeTyped(
  txBytes: Uint8Array,
  txType: number,
  typeLabel: string,
  payload: RlpValue,
  expectedCount: number,
): DecodedTx {
  if (!Array.isArray(payload) || payload.length !== expectedCount) {
    throw new Error(
      `${typeLabel} 交易字段数量非法：期望 ${expectedCount}，实际 ${Array.isArray(payload) ? payload.length : '非列表'}`,
    )
  }
  let cursor = 0
  const takeBytes = (field: string): Uint8Array => {
    const b = expectBytes(payload[cursor], field)
    cursor += 1
    return b
  }
  const chainIdB = takeBytes('chainId')
  const nonceB = takeBytes('nonce')
  const feeFields: TxField[] = []
  if (txType === 2) {
    feeFields.push(
      numField(
        'maxPriorityFeePerGas',
        'maxPriorityFeePerGas (wei)',
        takeBytes('maxPriorityFeePerGas'),
        'maxPriorityFeePerGas',
      ),
      numField('maxFeePerGas', 'maxFeePerGas (wei)', takeBytes('maxFeePerGas'), 'maxFeePerGas'),
    )
  } else {
    feeFields.push(numField('gasPrice', 'gasPrice (wei)', takeBytes('gasPrice'), 'gasPrice'))
  }
  const gasB = takeBytes('gasLimit')
  const toB = takeBytes('to')
  const valueB = takeBytes('value')
  const dataB = takeBytes('data')
  const accessListRaw = payload[cursor]
  cursor += 1
  const yParityB = takeBytes('yParity')
  const rB = takeBytes('r')
  const sB = takeBytes('s')

  const chainId = rlpToBigInt(chainIdB, 'chainId').toString(10)
  const yParity = rlpToBigInt(yParityB, 'yParity')
  if (yParity !== 0n && yParity !== 1n) throw new Error(`yParity 非法：${yParity}（须为 0 或 1）`)
  const to = formatAddress(toB, 'to')
  const hash = `0x${bytesToHex(keccak256(txBytes))}`
  const fields: TxField[] = [
    { key: 'type', label: '交易类型', value: typeLabel },
    { key: 'hash', label: '交易哈希', value: hash },
    { key: 'chainId', label: 'chainId', value: chainId },
    numField('nonce', 'nonce', nonceB, 'nonce'),
    ...feeFields,
    numField('gasLimit', 'gasLimit', gasB, 'gasLimit'),
    { key: 'to', label: 'to', value: to === '' ? '（合约创建）' : to },
    numField('value', 'value (wei)', valueB, 'value'),
    { key: 'data', label: 'data', value: formatData(dataB) },
    { key: 'accessList', label: 'accessList', value: decodeAccessList(accessListRaw) },
    { key: 'yParity', label: 'yParity', value: yParity.toString(10) },
    ...sigFields(rB, sB),
  ]
  return { txType, typeLabel, hash, chainId, fields }
}

/**
 * 解码原始交易 hex（0x 开头与否均可）。
 * 支持 Legacy（0x… 首字节 ≥ 0xc0）、EIP-2930 (0x01)、EIP-1559 (0x02)。
 */
export function decodeTransaction(rawHex: string): DecodedTx {
  const bytes = hexToBytes(rawHex)
  const first = bytes[0]
  if (first === 0x01 || first === 0x02) {
    const payload = rlpDecode(bytes.slice(1))
    return first === 0x01
      ? decodeTyped(bytes, 1, 'EIP-2930 (Type 1)', payload, 11)
      : decodeTyped(bytes, 2, 'EIP-1559 (Type 2)', payload, 12)
  }
  if (first >= 0xc0) {
    return decodeLegacy(bytes, rlpDecode(bytes))
  }
  throw new Error(
    `不支持的交易类型：0x${first.toString(16).padStart(2, '0')}（仅支持 Legacy / Type 1 / Type 2）`,
  )
}
