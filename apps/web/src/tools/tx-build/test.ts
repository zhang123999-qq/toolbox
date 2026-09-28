import { describe, expect, it } from 'vitest'
import {
  bigIntToBytes,
  buildUnsignedTx,
  bytesToHex,
  hexToBytes,
  rlpEncodeBytes,
  rlpEncodeList,
} from './utils'
import type { TxBuildInput as I, TxBuildOptions as O } from './schema'

const TO = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'

function baseInput(over: Partial<I> = {}): I {
  return {
    text: '',
    nonce: '0',
    gasLimit: '21000',
    to: TO,
    value: '0',
    data: '',
    chainId: '1',
    gasPrice: '20000000000',
    maxPriorityFeePerGas: '1000000000',
    maxFeePerGas: '2000000000',
    ...over,
  }
}

const LEGACY_OPTS: O = { txType: 'legacy' }
const EIP1559_OPTS: O = { txType: 'eip1559' }

/* ---------- 测试内 RLP 解码器（仅验证编码可 round-trip） ---------- */

type Rlp = Uint8Array | Rlp[]

function decodeOne(data: Uint8Array, pos: number): { value: Rlp; next: number } {
  const b0 = data[pos]
  if (b0 < 0x80) return { value: data.slice(pos, pos + 1), next: pos + 1 }
  if (b0 < 0xb8) {
    const len = b0 - 0x80
    return { value: data.slice(pos + 1, pos + 1 + len), next: pos + 1 + len }
  }
  if (b0 < 0xc0) {
    const ll = b0 - 0xb7
    let len = 0
    for (let i = 0; i < ll; i++) len = len * 256 + data[pos + 1 + i]
    const start = pos + 1 + ll
    return { value: data.slice(start, start + len), next: start + len }
  }
  const ll = b0 < 0xf8 ? 0 : b0 - 0xf7
  let len = b0 < 0xf8 ? b0 - 0xc0 : 0
  let start = pos + 1
  if (ll > 0) {
    len = 0
    for (let i = 0; i < ll; i++) len = len * 256 + data[pos + 1 + i]
    start = pos + 1 + ll
  }
  const items: Rlp[] = []
  let p = start
  while (p < start + len) {
    const r = decodeOne(data, p)
    items.push(r.value)
    p = r.next
  }
  return { value: items, next: start + len }
}

function rlpToBig(v: Uint8Array): bigint {
  if (v.length === 0) return 0n
  return BigInt('0x' + bytesToHex(v))
}

describe('tx-build · RLP 编码基础', () => {
  it('单字节 < 0x80 为其自身', () => {
    expect(bytesToHex(rlpEncodeBytes(Uint8Array.of(0x05)))).toBe('05')
  })

  it('空字节串 → 0x80', () => {
    expect(bytesToHex(rlpEncodeBytes(new Uint8Array(0)))).toBe('80')
  })

  it('长字节串用长头', () => {
    const data = new Uint8Array(60).fill(0xab)
    const enc = rlpEncodeBytes(data)
    expect(enc[0]).toBe(0xb8)
    expect(enc[1]).toBe(60)
  })

  it('bigIntToBytes(0) 为空串', () => {
    expect(bigIntToBytes(0n)).toHaveLength(0)
  })

  it('bigIntToBytes 负数报错', () => {
    expect(() => bigIntToBytes(-1n)).toThrow('RLP 整数不能为负')
  })

  it('hex 非法报错', () => {
    expect(() => hexToBytes('zz')).toThrow('hex 含非法字符')
    expect(() => hexToBytes('abc')).toThrow('hex 长度必须为偶数')
  })
})

describe('tx-build · Legacy', () => {
  it('手工验算已知编码', () => {
    const built = buildUnsignedTx(baseInput({ gasPrice: '0' }), LEGACY_OPTS)
    // nonce=0,gasPrice=0,gasLimit=21000,to,value=0,data='',chainId=1,v=0,r=0,s=0
    // payload 31 字节 → 0xdf
    expect(built.rlpHex).toBe('0xdf8080825208947e5f4552091a69125d5dfcb7b8c2659029395bdf8080018080')
  })

  it('round-trip 解码字段一致', () => {
    const built = buildUnsignedTx(baseInput(), LEGACY_OPTS)
    const raw = hexToBytes(built.rlpHex)
    const { value } = decodeOne(raw, 0)
    const items = value as Uint8Array[]
    expect(items).toHaveLength(9)
    expect(rlpToBig(items[0]).toString()).toBe('0')
    expect(rlpToBig(items[1]).toString()).toBe('20000000000')
    expect(rlpToBig(items[2]).toString()).toBe('21000')
    expect('0x' + bytesToHex(items[3]).toLowerCase()).toBe(TO.toLowerCase())
    expect(rlpToBig(items[6]).toString()).toBe('1')
  })

  it('to 留空表示合约创建', () => {
    const built = buildUnsignedTx(baseInput({ to: '' }), LEGACY_OPTS)
    expect(built.fields.find((f) => f.key === 'to')?.value).toBe('（合约创建）')
  })

  it('to 无 0x 前缀与 0X 前缀均可', () => {
    const noPrefix = buildUnsignedTx(baseInput({ to: TO.slice(2) }), LEGACY_OPTS)
    const upperPrefix = buildUnsignedTx(baseInput({ to: '0X' + TO.slice(2) }), LEGACY_OPTS)
    expect(noPrefix.fields.find((f) => f.key === 'to')?.value.toLowerCase()).toBe(TO.toLowerCase())
    expect(upperPrefix.fields.find((f) => f.key === 'to')?.value.toLowerCase()).toBe(
      TO.toLowerCase(),
    )
  })

  it('data 非空参与编码', () => {
    const built = buildUnsignedTx(baseInput({ data: '0x1234' }), LEGACY_OPTS)
    expect(built.fields.find((f) => f.key === 'data')?.value).toBe('0x1234')
    expect(built.rlpHex).toContain('821234')
  })

  it('value 为空默认 0', () => {
    const built = buildUnsignedTx(baseInput({ value: '' }), LEGACY_OPTS)
    expect(built.fields.find((f) => f.key === 'value')?.value).toBe('0')
  })

  it('chainId 为空默认 1', () => {
    const built = buildUnsignedTx(baseInput({ chainId: '' }), LEGACY_OPTS)
    expect(built.fields.find((f) => f.key === 'chainId')?.value).toBe('1')
  })

  it('to 非法报错', () => {
    expect(() => buildUnsignedTx(baseInput({ to: '0x123' }), LEGACY_OPTS)).toThrow(
      'to 地址格式非法',
    )
  })

  it('数值非法报错', () => {
    expect(() => buildUnsignedTx(baseInput({ nonce: 'abc' }), LEGACY_OPTS)).toThrow('nonce格式非法')
    expect(() => buildUnsignedTx(baseInput({ nonce: '' }), LEGACY_OPTS)).toThrow('nonce不能为空')
  })

  it('chainId 为 0 报错', () => {
    expect(() => buildUnsignedTx(baseInput({ chainId: '0' }), LEGACY_OPTS)).toThrow(
      'chainId 不能为 0',
    )
  })
})

describe('tx-build · EIP-1559', () => {
  it('手工验算已知编码', () => {
    const built = buildUnsignedTx(
      baseInput({ nonce: '0', maxPriorityFeePerGas: '0x3b9aca00', maxFeePerGas: '0x77359400' }),
      EIP1559_OPTS,
    )
    // 0x02 || list(39 字节 → 0xe7)
    expect(built.rlpHex).toBe(
      '0x02e70180843b9aca008477359400825208947e5f4552091a69125d5dfcb7b8c2659029395bdf8080c0',
    )
  })

  it('round-trip 解码字段一致', () => {
    const built = buildUnsignedTx(baseInput(), EIP1559_OPTS)
    const raw = hexToBytes(built.rlpHex)
    expect(raw[0]).toBe(0x02)
    const { value } = decodeOne(raw, 1)
    const items = value as Uint8Array[]
    expect(items).toHaveLength(9)
    expect(rlpToBig(items[0]).toString()).toBe('1')
    expect(rlpToBig(items[2]).toString()).toBe('1000000000')
    expect(rlpToBig(items[3]).toString()).toBe('2000000000')
    expect(Array.isArray(items[8]) ? items[8] : []).toHaveLength(0)
  })

  it('maxFee < maxPriority 报错', () => {
    expect(() =>
      buildUnsignedTx(baseInput({ maxFeePerGas: '1', maxPriorityFeePerGas: '2' }), EIP1559_OPTS),
    ).toThrow('maxFeePerGas 不能小于 maxPriorityFeePerGas')
  })

  it('缺失费用字段报错', () => {
    expect(() => buildUnsignedTx(baseInput({ maxFeePerGas: '' }), EIP1559_OPTS)).toThrow(
      'maxFeePerGas不能为空',
    )
  })
})

describe('tx-build · 字段展示', () => {
  it('字段含类型与 hex 输出', () => {
    const built = buildUnsignedTx(baseInput(), LEGACY_OPTS)
    expect(built.fields[0].value).toBe('Legacy')
    expect(built.rlpHex.startsWith('0x')).toBe(true)
    const built2 = buildUnsignedTx(baseInput(), EIP1559_OPTS)
    expect(built2.fields[0].value).toBe('EIP-1559 (Type 2)')
  })

  it('data 为空展示 0x', () => {
    const built = buildUnsignedTx(baseInput(), LEGACY_OPTS)
    expect(built.fields.find((f) => f.key === 'data')?.value).toBe('0x')
  })

  it('rlpEncodeList 空列表', () => {
    expect(bytesToHex(rlpEncodeList([]))).toBe('c0')
  })
})
