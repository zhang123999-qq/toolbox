import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  decodeAccessList,
  decodeTransaction,
  formatAddress,
  formatData,
  hexToBytes,
  isRlpBytes,
  keccak256,
  parseLegacyV,
  rlpDecode,
  rlpToBigInt,
  toChecksumAddress,
  type DecodedTx,
  type RlpValue,
  type TxField,
} from './utils'

/* ---------- 测试用 RLP 编码器（仅构造用例） ---------- */

function encLen(len: number, offset: number): Uint8Array {
  if (len <= 55) return Uint8Array.of(offset + len)
  const bytes: number[] = []
  let n = len
  while (n > 0) {
    bytes.unshift(n & 0xff)
    n >>= 8
  }
  return Uint8Array.of(offset + 55 + bytes.length, ...bytes)
}

function encBytes(b: Uint8Array): Uint8Array {
  if (b.length === 1 && b[0] < 0x80) return b
  const h = encLen(b.length, 0x80)
  const out = new Uint8Array(h.length + b.length)
  out.set(h)
  out.set(b, h.length)
  return out
}

function encList(items: Uint8Array[]): Uint8Array {
  const total = items.reduce((n, p) => n + p.length, 0)
  const payload = new Uint8Array(total)
  let o = 0
  for (const p of items) {
    payload.set(p, o)
    o += p.length
  }
  const h = encLen(total, 0xc0)
  const out = new Uint8Array(h.length + total)
  out.set(h)
  out.set(payload, h.length)
  return out
}

/** 最小大端字节串；0 → 空串 */
function bi(n: number | bigint): Uint8Array {
  let v = BigInt(n)
  if (v === 0n) return new Uint8Array(0)
  const bytes: number[] = []
  while (v > 0n) {
    bytes.unshift(Number(v & 0xffn))
    v >>= 8n
  }
  return Uint8Array.from(bytes)
}

const ADDR = hexToBytes('7e5f4552091a69125d5dfcb7b8c2659029395bdf')
const ADDR_CHECKSUM = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'

function fieldOf(tx: DecodedTx, key: string): TxField {
  const f = tx.fields.find((x) => x.key === key)
  if (!f) throw new Error(`缺少字段 ${key}`)
  return f
}

/* ---------- 基础工具 ---------- */

describe('基础工具', () => {
  it('hexToBytes 往返与校验', () => {
    expect(bytesToHex(hexToBytes('0x0102ff'))).toBe('0102ff')
    expect(bytesToHex(hexToBytes('0102FF'))).toBe('0102ff')
    expect(() => hexToBytes('')).toThrow('为空')
    expect(() => hexToBytes('0x123')).toThrow('偶数')
    expect(() => hexToBytes('0xzz')).toThrow('非法字符')
  })

  it('keccak256 空串向量', () => {
    expect(bytesToHex(keccak256(new Uint8Array(0)))).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    )
  })

  it('toChecksumAddress', () => {
    expect(toChecksumAddress('7e5f4552091a69125d5dfcb7b8c2659029395bdf')).toBe(ADDR_CHECKSUM)
  })

  it('isRlpBytes 类型谓词', () => {
    const v: RlpValue = hexToBytes('0x01')
    expect(isRlpBytes(v)).toBe(true)
    expect(isRlpBytes([v])).toBe(false)
  })

  it('rlpToBigInt', () => {
    expect(rlpToBigInt(new Uint8Array(0), 'nonce')).toBe(0n)
    expect(rlpToBigInt(hexToBytes('0x0100'), 'nonce')).toBe(256n)
    expect(() => rlpToBigInt(hexToBytes('0x0001'), 'nonce')).toThrow('前导零')
  })

  it('formatAddress', () => {
    expect(formatAddress(new Uint8Array(0), 'to')).toBe('')
    expect(formatAddress(ADDR, 'to')).toBe(ADDR_CHECKSUM)
    expect(() => formatAddress(hexToBytes('0x0102'), 'to')).toThrow('20 字节')
  })

  it('formatData', () => {
    expect(formatData(new Uint8Array(0))).toBe('0x')
    expect(formatData(new TextEncoder().encode('hello'))).toBe('0x68656c6c6f ("hello")')
    expect(formatData(hexToBytes('0x600d'))).toBe('0x600d')
    const big = new Uint8Array(65).fill(0xab)
    expect(formatData(big)).toBe(`0x${'ab'.repeat(65)}`)
  })

  it('parseLegacyV', () => {
    expect(parseLegacyV(37n, false, false)).toEqual({
      chainId: '1',
      text: '37（EIP-155，yParity=0）',
    })
    expect(parseLegacyV(27n, false, false).chainId).toBeNull()
    expect(parseLegacyV(28n, false, false).text).toContain('未启用 EIP-155')
    expect(parseLegacyV(1n, true, true).text).toContain('待签名')
    expect(() => parseLegacyV(5n, false, false)).toThrow('v 值非法')
  })
})

/* ---------- RLP 解码 ---------- */

describe('rlpDecode', () => {
  it('单字节', () => {
    expect(rlpDecode(hexToBytes('0x05'))).toEqual(hexToBytes('0x05'))
  })

  it('空串', () => {
    expect(rlpDecode(hexToBytes('0x80'))).toEqual(new Uint8Array(0))
  })

  it('短字符串', () => {
    const v = rlpDecode(hexToBytes('0x8568656c6c6f'))
    expect(new TextDecoder().decode(v as Uint8Array)).toBe('hello')
  })

  it('单字节 0x80 用短格式', () => {
    expect(rlpDecode(hexToBytes('0x8180'))).toEqual(hexToBytes('0x80'))
  })

  it('长字符串（60 字节）', () => {
    const raw = `0xb83c${'61'.repeat(60)}`
    expect((rlpDecode(hexToBytes(raw)) as Uint8Array).length).toBe(60)
  })

  it('短列表', () => {
    const v = rlpDecode(hexToBytes('0xc20102')) as RlpValue[]
    expect(v.length).toBe(2)
    expect(bytesToHex(v[0] as Uint8Array)).toBe('01')
  })

  it('长列表（60 个单字节）', () => {
    const raw = `0xf83c${'01'.repeat(60)}`
    expect((rlpDecode(hexToBytes(raw)) as RlpValue[]).length).toBe(60)
  })

  it('空列表', () => {
    expect(rlpDecode(hexToBytes('0xc0'))).toEqual([])
  })

  it('非规范：单字节用字符串包装', () => {
    expect(() => rlpDecode(hexToBytes('0x8101'))).toThrow('不应使用字符串包装')
  })

  it('非规范：短字符串用长格式', () => {
    expect(() => rlpDecode(hexToBytes(`0xb837${'61'.repeat(55)}`))).toThrow('长格式')
  })

  it('非规范：长度前导零', () => {
    expect(() => rlpDecode(hexToBytes(`0xb90038${'61'.repeat(56)}`))).toThrow('前导零')
  })

  it('非规范：短列表用长格式', () => {
    expect(() => rlpDecode(hexToBytes(`0xf837${'01'.repeat(55)}`))).toThrow('长格式')
  })

  it('非规范：列表长度前导零', () => {
    expect(() => rlpDecode(hexToBytes('0xf90038'))).toThrow('前导零')
  })

  it('非规范：子项超出列表载荷边界', () => {
    // 列表声明载荷 2 字节，但子项是 5 字节字符串（0x85 'hello'）
    expect(() => rlpDecode(hexToBytes('0xc28568656c6c6f'))).toThrow('超出列表载荷边界')
  })

  it('非规范：整数字段单字节 0x00 零值', () => {
    expect(() => rlpToBigInt(hexToBytes('0x00'), 'nonce')).toThrow('零值应为空串')
    // 真实交易里的 nonce=0 应编码为空串（0x80），单字节 0x00 的交易整体也应拒绝
    expect(() =>
      decodeTransaction(
        '0xf871008504a817c800825208947e5f4552091a69125d5dfcb7b8c2659029395bdf880de0b6b3a76400008568656c6c6f25a0d3afccdaf742afeb35d5e5f4fde0051e28dda0afb243f25eb2c95a1869c78d5fa027c70791a540ccd72d2a5e601e27eb0b13ca3c0564089a843c39eef6f38258dd',
      ),
    ).toThrow('零值应为空串')
  })

  it('长度超出支持范围', () => {
    expect(() => rlpDecode(hexToBytes('0xbbffffffff'))).toThrow('超出支持范围')
  })

  it('截断：字符串载荷不足', () => {
    expect(() => rlpDecode(hexToBytes('0x8568656c'))).toThrow('截断')
  })

  it('截断：长字符串载荷不足', () => {
    expect(() => rlpDecode(hexToBytes(`0xb83c${'61'.repeat(59)}`))).toThrow('截断')
  })

  it('截断：列表载荷不足', () => {
    expect(() => rlpDecode(hexToBytes('0xc1'))).toThrow('载荷不足')
  })

  it('截断：嵌套中字符串载荷不足', () => {
    expect(() => rlpDecode(hexToBytes('0xc385010203'))).toThrow('载荷不足')
  })

  it('截断：长度字节不足', () => {
    expect(() => rlpDecode(hexToBytes('0xb938'))).toThrow('长度字节不足')
  })

  it('尾部多余字节', () => {
    expect(() => rlpDecode(hexToBytes('0x0102'))).toThrow('多余字节')
  })

  it('输入为空', () => {
    expect(() => rlpDecode(new Uint8Array(0))).toThrow('为空')
  })
})

/* ---------- accessList ---------- */

describe('decodeAccessList', () => {
  const addr20 = ADDR
  const key32 = hexToBytes(`0x${'00'.repeat(31)}01`)

  it('空列表', () => {
    expect(decodeAccessList([])).toBe('[]')
  })

  it('单条目', () => {
    const got = JSON.parse(decodeAccessList([[addr20, [key32]]]))
    expect(got).toEqual([
      { address: ADDR_CHECKSUM, storageKeys: [`0x${'00'.repeat(31)}01`] },
    ])
  })

  it('非列表抛错', () => {
    expect(() => decodeAccessList(hexToBytes('0x80'))).toThrow('须为列表')
  })

  it('条目非二元组抛错', () => {
    expect(() => decodeAccessList([addr20])).toThrow('条目须为')
    expect(() => decodeAccessList([[addr20]])).toThrow('条目须为')
  })

  it('地址非 20 字节抛错', () => {
    expect(() => decodeAccessList([[hexToBytes('0x0102'), []]])).toThrow('20 字节')
  })

  it('storageKeys 非列表抛错', () => {
    expect(() => decodeAccessList([[addr20, key32]])).toThrow('storageKeys 须为列表')
  })

  it('storageKey 非 32 字节抛错', () => {
    expect(() => decodeAccessList([[addr20, [hexToBytes('0x01')]]])).toThrow('32 字节')
  })
})

/* ---------- 真实交易向量 ---------- */

const LEGACY_RAW =
  '0xf871078504a817c800825208947e5f4552091a69125d5dfcb7b8c2659029395bdf880de0b6b3a76400008568656c6c6f25a0d3afccdaf742afeb35d5e5f4fde0051e28dda0afb243f25eb2c95a1869c78d5fa027c70791a540ccd72d2a5e601e27eb0b13ca3c0564089a843c39eef6f38258dd'
const EIP1559_RAW =
  '0x02f873010384773594008506fc23ac00825208947e5f4552091a69125d5dfcb7b8c2659029395bdf8806f05b59d3b2000080c001a0cd9814e086449ff557389ab33394089629d0c9d80102ce47c05c8fd12232c2dfa024dfb08f2a76013b851b97c150822f5ff7c3dfebbbe3bb917f7e339427c86fae'
const CREATE_RAW =
  '0xf85480843b9aca00830186a08080846060604026a0d81ba65782d3817c9a8faa6d089b04c7cfdf9c9d4ffd34a60477df51ec290622a067b06bb6e12b3f3378a535b6f0cdf7e2bc6956d8d84efbf3045790e80267d6bd'

describe('decodeTransaction 真实向量', () => {
  it('Legacy EIP-155 交易', () => {
    const tx = decodeTransaction(LEGACY_RAW)
    expect(tx.txType).toBe(0)
    expect(tx.typeLabel).toBe('Legacy')
    expect(tx.hash).toBe('0x393204fda69e377f7d7c60468a2475068d940146115e77ff445230da311435cf')
    expect(tx.chainId).toBe('1')
    expect(fieldOf(tx, 'nonce')).toMatchObject({ value: '7', sub: '0x07' })
    expect(fieldOf(tx, 'gasPrice')).toMatchObject({ value: '20000000000', sub: '0x04a817c800' })
    expect(fieldOf(tx, 'gasLimit').value).toBe('21000')
    expect(fieldOf(tx, 'to').value).toBe(ADDR_CHECKSUM)
    expect(fieldOf(tx, 'value')).toMatchObject({
      value: '1000000000000000000',
      sub: '0x0de0b6b3a7640000',
    })
    expect(fieldOf(tx, 'data').value).toBe('0x68656c6c6f ("hello")')
    expect(fieldOf(tx, 'v').value).toContain('EIP-155')
    expect(fieldOf(tx, 'r').value).toBe(
      '0xd3afccdaf742afeb35d5e5f4fde0051e28dda0afb243f25eb2c95a1869c78d5f',
    )
    expect(fieldOf(tx, 's').value).toBe(
      '0x27c70791a540ccd72d2a5e601e27eb0b13ca3c0564089a843c39eef6f38258dd',
    )
  })

  it('EIP-1559 (Type 2) 交易', () => {
    const tx = decodeTransaction(EIP1559_RAW)
    expect(tx.txType).toBe(2)
    expect(tx.typeLabel).toBe('EIP-1559 (Type 2)')
    expect(tx.hash).toBe('0xab7f75654fad5e92f41eff3398f6f6b278d229e03bcd9a2b051a6d337e3eceb2')
    expect(tx.chainId).toBe('1')
    expect(fieldOf(tx, 'nonce').value).toBe('3')
    expect(fieldOf(tx, 'maxPriorityFeePerGas')).toMatchObject({
      value: '2000000000',
      sub: '0x77359400',
    })
    expect(fieldOf(tx, 'maxFeePerGas')).toMatchObject({
      value: '30000000000',
      sub: '0x06fc23ac00',
    })
    expect(fieldOf(tx, 'gasLimit').value).toBe('21000')
    expect(fieldOf(tx, 'to').value).toBe(ADDR_CHECKSUM)
    expect(fieldOf(tx, 'value')).toMatchObject({
      value: '500000000000000000',
      sub: '0x06f05b59d3b20000',
    })
    expect(fieldOf(tx, 'data').value).toBe('0x')
    expect(fieldOf(tx, 'accessList').value).toBe('[]')
    expect(fieldOf(tx, 'yParity').value).toBe('1')
    expect(fieldOf(tx, 'r').value).toBe(
      '0xcd9814e086449ff557389ab33394089629d0c9d80102ce47c05c8fd12232c2df',
    )
    expect(fieldOf(tx, 's').value).toBe(
      '0x24dfb08f2a76013b851b97c150822f5ff7c3dfebbbe3bb917f7e339427c86fae',
    )
  })

  it('Legacy 合约创建（to 为空）', () => {
    const tx = decodeTransaction(CREATE_RAW)
    expect(tx.txType).toBe(0)
    expect(fieldOf(tx, 'to').value).toBe('（合约创建）')
    expect(fieldOf(tx, 'data').value).toBe('0x60606040 ("```@")')
    expect(tx.hash).toBe('0xae074f50327344c29ea540624adcac9858f23efd938191a396faefd42c50fc91')
  })
})

/* ---------- 构造交易（分支覆盖） ---------- */

describe('decodeTransaction 构造用例', () => {
  it('EIP-2930 (Type 1) 完整字段', () => {
    const key32 = hexToBytes(`0x${'00'.repeat(31)}01`)
    const accessList = encList([encList([encBytes(ADDR), encList([encBytes(key32)])])])
    const payload = encList([
      encBytes(bi(1)), // chainId
      encBytes(bi(0)), // nonce
      encBytes(bi(1_000_000_000)), // gasPrice
      encBytes(bi(21000)), // gasLimit
      encBytes(ADDR), // to
      encBytes(bi(0)), // value
      encBytes(new Uint8Array(65).fill(0xab)), // data（65 字节，不可打印后缀）
      accessList,
      encBytes(bi(0)), // yParity
      encBytes(bi(1)), // r
      encBytes(bi(2)), // s
    ])
    const raw = `0x01${bytesToHex(payload)}`
    const tx = decodeTransaction(raw)
    expect(tx.txType).toBe(1)
    expect(tx.typeLabel).toBe('EIP-2930 (Type 1)')
    expect(tx.chainId).toBe('1')
    expect(fieldOf(tx, 'gasPrice').value).toBe('1000000000')
    expect(fieldOf(tx, 'yParity').value).toBe('0')
    const al = JSON.parse(fieldOf(tx, 'accessList').value)
    expect(al).toEqual([
      { address: ADDR_CHECKSUM, storageKeys: [`0x${'00'.repeat(31)}01`] },
    ])
    expect(fieldOf(tx, 'data').value).toBe(`0x${'ab'.repeat(65)}`)
    expect(tx.hash).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('Type 2 合约创建（to 为空）', () => {
    const payload = encList([
      encBytes(bi(1)),
      encBytes(bi(0)),
      encBytes(bi(0)),
      encBytes(bi(0)),
      encBytes(bi(21000)),
      encBytes(new Uint8Array(0)),
      encBytes(bi(0)),
      encBytes(new Uint8Array(0)),
      encList([]),
      encBytes(bi(1)),
      encBytes(bi(1)),
      encBytes(bi(2)),
    ])
    const tx = decodeTransaction(`0x02${bytesToHex(payload)}`)
    expect(fieldOf(tx, 'to').value).toBe('（合约创建）')
  })

  it('Type 2 yParity 非法抛错', () => {
    const payload = encList([
      encBytes(bi(1)),
      encBytes(bi(0)),
      encBytes(bi(0)),
      encBytes(bi(0)),
      encBytes(bi(21000)),
      encBytes(ADDR),
      encBytes(bi(0)),
      encBytes(new Uint8Array(0)),
      encList([]),
      encBytes(bi(2)),
      encBytes(bi(1)),
      encBytes(bi(2)),
    ])
    expect(() => decodeTransaction(`0x02${bytesToHex(payload)}`)).toThrow('yParity 非法')
  })

  it('Legacy v=27（未启用 EIP-155）无 chainId 字段', () => {
    const payload = encList([
      encBytes(bi(0)),
      encBytes(bi(0)),
      encBytes(bi(21000)),
      encBytes(ADDR),
      encBytes(bi(0)),
      encBytes(new Uint8Array(0)),
      encBytes(bi(27)),
      encBytes(bi(1)),
      encBytes(bi(2)),
    ])
    const tx = decodeTransaction(`0x${bytesToHex(payload)}`)
    expect(tx.chainId).toBeNull()
    expect(tx.fields.find((f) => f.key === 'chainId')).toBeUndefined()
    expect(fieldOf(tx, 'v').value).toContain('未启用 EIP-155')
  })

  it('Legacy 字段数量非法抛错', () => {
    const payload = encList([
      encBytes(bi(0)),
      encBytes(bi(0)),
      encBytes(bi(21000)),
      encBytes(ADDR),
      encBytes(bi(0)),
      encBytes(new Uint8Array(0)),
      encBytes(bi(27)),
      encBytes(bi(1)),
    ])
    expect(() => decodeTransaction(`0x${bytesToHex(payload)}`)).toThrow('字段数量非法')
  })

  it('Type 2 字段数量非法抛错', () => {
    const payload = encList([encBytes(bi(1))])
    expect(() => decodeTransaction(`0x02${bytesToHex(payload)}`)).toThrow('字段数量非法')
  })

  it('Type 2 载荷非列表抛错', () => {
    expect(() => decodeTransaction('0x0201')).toThrow('非列表')
  })

  it('字段为列表时抛错（nonce）', () => {
    const payload = encList([
      encList([]),
      encBytes(bi(0)),
      encBytes(bi(21000)),
      encBytes(ADDR),
      encBytes(bi(0)),
      encBytes(new Uint8Array(0)),
      encBytes(bi(27)),
      encBytes(bi(1)),
      encBytes(bi(2)),
    ])
    expect(() => decodeTransaction(`0x${bytesToHex(payload)}`)).toThrow('nonce 须为字节串')
  })

  it('不支持的交易类型抛错', () => {
    expect(() => decodeTransaction('0x03820102')).toThrow('不支持的交易类型')
  })
})
