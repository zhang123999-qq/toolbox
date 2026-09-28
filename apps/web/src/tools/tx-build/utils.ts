import type { TxBuildInput, TxBuildOptions } from './schema'

/* ---------- hex / bytes ---------- */

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new Error('hex 含非法字符')
  if (h.length % 2 !== 0) throw new Error('hex 长度必须为偶数')
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/* ---------- RLP 编码 ---------- */

function encodeLength(len: number, offset: number): Uint8Array {
  if (len <= 55) return Uint8Array.of(offset + len)
  const bytes: number[] = []
  let n = len
  while (n > 0) {
    bytes.unshift(n & 0xff)
    n >>= 8
  }
  return Uint8Array.of(offset + 55 + bytes.length, ...bytes)
}

/** RLP 编码字节串（单字节 < 0x80 时为其自身） */
export function rlpEncodeBytes(data: Uint8Array): Uint8Array {
  if (data.length === 1 && data[0] < 0x80) return data
  const h = encodeLength(data.length, 0x80)
  const out = new Uint8Array(h.length + data.length)
  out.set(h)
  out.set(data, h.length)
  return out
}

/** RLP 编码列表 */
export function rlpEncodeList(items: Uint8Array[]): Uint8Array {
  const total = items.reduce((n, p) => n + p.length, 0)
  const payload = new Uint8Array(total)
  let o = 0
  for (const p of items) {
    payload.set(p, o)
    o += p.length
  }
  const h = encodeLength(total, 0xc0)
  const out = new Uint8Array(h.length + total)
  out.set(h)
  out.set(payload, h.length)
  return out
}

/** BigInt → 最小大端字节串（0 → 空串，符合 RLP 整数规范） */
export function bigIntToBytes(v: bigint): Uint8Array {
  if (v < 0n) throw new Error('RLP 整数不能为负')
  if (v === 0n) return new Uint8Array(0)
  let hex = v.toString(16)
  if (hex.length % 2 !== 0) hex = '0' + hex
  return hexToBytes(hex)
}

/* ---------- 参数解析 ---------- */

function parseUint(name: string, raw: string): bigint {
  const t = raw.trim()
  if (t === '') throw new Error(`${name}不能为空`)
  if (!/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(t))
    throw new Error(`${name}格式非法：${raw}（十进制或 0x hex）`)
  return BigInt(t)
}

function parseAddress(raw: string): Uint8Array {
  const t = raw.trim()
  if (t === '') return new Uint8Array(0) // 合约创建：to 为空
  const h = t.startsWith('0x') || t.startsWith('0X') ? t.slice(2) : t
  if (!/^[0-9a-fA-F]{40}$/.test(h))
    throw new Error(`to 地址格式非法：${raw}（应为 0x + 40 位 hex，合约创建请留空）`)
  return hexToBytes(h)
}

function parseData(raw: string): Uint8Array {
  const t = raw.trim()
  if (t === '') return new Uint8Array(0)
  return hexToBytes(t)
}

export interface BuiltTx {
  readonly txType: string
  readonly rlpHex: string
  readonly fields: ReadonlyArray<{ key: string; label: string; value: string }>
}

/** 组装未签名交易并 RLP 编码 */
export function buildUnsignedTx(input: TxBuildInput, options: TxBuildOptions): BuiltTx {
  const nonce = parseUint('nonce', input.nonce)
  const gasLimit = parseUint('gasLimit', input.gasLimit)
  const to = parseAddress(input.to)
  const value = parseUint('value', input.value === '' ? '0' : input.value)
  const data = parseData(input.data)
  const chainId = parseUint('chainId', input.chainId === '' ? '1' : input.chainId)
  if (chainId === 0n) throw new Error('chainId 不能为 0')

  const fields: Array<{ key: string; label: string; value: string }> = [
    {
      key: 'type',
      label: '类型',
      value: options.txType === 'eip1559' ? 'EIP-1559 (Type 2)' : 'Legacy',
    },
    { key: 'nonce', label: 'nonce', value: nonce.toString() },
    { key: 'gasLimit', label: 'gasLimit', value: gasLimit.toString() },
    { key: 'to', label: 'to', value: to.length === 0 ? '（合约创建）' : '0x' + bytesToHex(to) },
    { key: 'value', label: 'value (wei)', value: value.toString() },
    { key: 'data', label: 'data', value: data.length === 0 ? '0x' : '0x' + bytesToHex(data) },
    { key: 'chainId', label: 'chainId', value: chainId.toString() },
  ]

  let payload: Uint8Array
  if (options.txType === 'eip1559') {
    const maxPriority = parseUint('maxPriorityFeePerGas', input.maxPriorityFeePerGas)
    const maxFee = parseUint('maxFeePerGas', input.maxFeePerGas)
    if (maxFee < maxPriority) throw new Error('maxFeePerGas 不能小于 maxPriorityFeePerGas')
    fields.splice(2, 0, {
      key: 'maxPriorityFeePerGas',
      label: 'maxPriorityFeePerGas (wei)',
      value: maxPriority.toString(),
    })
    fields.splice(3, 0, {
      key: 'maxFeePerGas',
      label: 'maxFeePerGas (wei)',
      value: maxFee.toString(),
    })
    const list = rlpEncodeList([
      rlpEncodeBytes(bigIntToBytes(chainId)),
      rlpEncodeBytes(bigIntToBytes(nonce)),
      rlpEncodeBytes(bigIntToBytes(maxPriority)),
      rlpEncodeBytes(bigIntToBytes(maxFee)),
      rlpEncodeBytes(bigIntToBytes(gasLimit)),
      rlpEncodeBytes(to),
      rlpEncodeBytes(bigIntToBytes(value)),
      rlpEncodeBytes(data),
      rlpEncodeList([]), // accessList 为空
    ])
    payload = new Uint8Array(1 + list.length)
    payload[0] = 0x02
    payload.set(list, 1)
  } else {
    const gasPrice = parseUint('gasPrice', input.gasPrice)
    fields.splice(2, 0, { key: 'gasPrice', label: 'gasPrice (wei)', value: gasPrice.toString() })
    payload = rlpEncodeList([
      rlpEncodeBytes(bigIntToBytes(nonce)),
      rlpEncodeBytes(bigIntToBytes(gasPrice)),
      rlpEncodeBytes(bigIntToBytes(gasLimit)),
      rlpEncodeBytes(to),
      rlpEncodeBytes(bigIntToBytes(value)),
      rlpEncodeBytes(data),
      rlpEncodeBytes(bigIntToBytes(chainId)),
      rlpEncodeBytes(new Uint8Array(0)),
      rlpEncodeBytes(new Uint8Array(0)),
    ])
  }

  return { txType: options.txType, rlpHex: '0x' + bytesToHex(payload), fields }
}
