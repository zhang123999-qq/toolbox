/**
 * sign-verify（#704）utils 单测：
 * personal_sign 哈希 / RFC6979 / 签名 / ecrecover。
 * 签名向量由 Python ecdsa 库（RFC6979 确定性 k）独立生成。
 */
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  assertValidRS,
  bytesToHex,
  ecrecover,
  hexToBytes,
  hmacSha256,
  isOnCurve,
  modInv,
  modPow,
  normalizeLowS,
  parsePrivateKeyHex,
  parseSignatureHex,
  personalMessageHash,
  pointAdd,
  pointDouble,
  pointMul,
  privateToPublic,
  publicToAddress,
  recoverAddress,
  rfc6979,
  scalarMul,
  SECP256K1_GX,
  SECP256K1_GY,
  SECP256K1_N,
  SECP256K1_P,
  sign,
  signatureToHex,
  toChecksumAddress,
  verifySignature,
  type DeterministicKFn,
  type HmacSha256Fn,
} from './utils'

const hexOf = (b: Uint8Array) => bytesToHex(b)
const te = new TextEncoder()

/** 独立向量 1：priv=1，msg="hello"（Python ecdsa 生成） */
const V1 = {
  priv: '0000000000000000000000000000000000000000000000000000000000000001',
  msg: 'hello',
  hash: '50b2c43fd39106bafbba0da34fc430e1f91e3c96ea2acee2bc34119f92b37750',
  r: 'e5ddc160e4c8f92de507c7db9b982d4f9b7197bfa421864aeadc586bc96b09ae',
  s: '0ba0c5b131650ae4994cff1839341d00f3735ef5abc62ac8fe2cf50f65208e2a',
  v: 27,
  address: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
}
/** 独立向量 2（Python ecdsa 生成） */
const V2 = {
  priv: 'a2fff6d9fdebe758e58913998b4f3df4879d1afd8beb5da8aff9fca1b5ba672f',
  msg: 'Hello, Ethereum!',
  hash: '5b001f2ad81fe86899545b51f8ecd1ca08674437d5c4748e1b70ba5dcf85ed86',
  r: '8cdb3a25caf58a27a5515b9d65c1d6dbed634b5c2ec229533a22835538e159c7',
  s: '404620fad532e21560b45f9b3509b289af0ba3b2a054506c737d58eef1b28c70',
  v: 27,
}
/** 构造向量：s·R = e·G → ecrecover 点减为无穷远点（Python 构造） */
const VNULL = {
  hash: 'f9a8a4ace98af7237dc25c7b85eb9401a5ed68ddcdcf2318e86542947660d776',
  r: '21db2d8d3aed9ea73446a6c40ca2616e2adec05739eeaf184d243bfd35aa2b01',
  s: '2',
  v: 27,
}

const G = { x: SECP256K1_GX, y: SECP256K1_GY }

describe('personalMessageHash', () => {
  it('与独立 keccak 计算一致（向量 1/2）', () => {
    expect(hexOf(personalMessageHash(V1.msg))).toBe(V1.hash)
    expect(hexOf(personalMessageHash(V2.msg))).toBe(V2.hash)
  })
  it('前缀包含字节长度', () => {
    // "hello" 5 字节
    const h = hexOf(personalMessageHash('hello'))
    expect(h).toBe(V1.hash)
  })
})

describe('hmacSha256（手写）', () => {
  it('与 Node crypto 一致', () => {
    const cases: Array<[string, string]> = [
      ['key', 'The quick brown fox jumps over the lazy dog'],
      ['', ''],
    ]
    for (const [k, m] of cases) {
      expect(hexOf(hmacSha256(te.encode(k), te.encode(m)))).toBe(
        createHmac('sha256', k).update(m).digest('hex'),
      )
    }
  })
  it('超长 key 先哈希', () => {
    const k = te.encode('k'.repeat(100))
    expect(hexOf(hmacSha256(k, te.encode('m')))).toBe(
      createHmac('sha256', k).update('m').digest('hex'),
    )
  })
})

describe('modPow', () => {
  it('基本幂', () => {
    expect(modPow(2n, 10n, 1000n)).toBe(24n)
    expect(modPow(5n, 0n, 7n)).toBe(1n)
  })
  it('非法参数抛错', () => {
    expect(() => modPow(2n, 3n, 0n)).toThrow('模数须为正数')
    expect(() => modPow(2n, -1n, 7n)).toThrow('指数须为非负数')
  })
})

describe('scalarMul', () => {
  it('k=0 返回 null', () => {
    expect(scalarMul(0n, G)).toBeNull()
  })
  it('与 pointMul 一致', () => {
    for (const k of [1n, 2n, 7n, 123456789n]) {
      const a = scalarMul(k, G)!
      const b = pointMul(k)
      expect(a.x).toBe(b.x)
      expect(a.y).toBe(b.y)
    }
  })
  it('非法标量抛错', () => {
    expect(() => scalarMul(-1n, G)).toThrow('标量')
    expect(() => scalarMul(SECP256K1_N, G)).toThrow('标量')
  })
})

describe('rfc6979', () => {
  const priv1 = hexToBytes(V1.priv)
  const hash1 = hexToBytes(V1.hash)
  it('确定性：同一输入同一 k，且对应向量 r', () => {
    const k1 = rfc6979(priv1, hash1)
    const k2 = rfc6979(priv1, hash1)
    expect(k1).toBe(k2)
    expect((pointMul(k1).x % SECP256K1_N).toString(16).padStart(64, '0')).toBe(V1.r)
  })
  it('非法输入抛错', () => {
    expect(() => rfc6979(new Uint8Array(31), hash1)).toThrow('私钥须为 32 字节')
    expect(() => rfc6979(priv1, new Uint8Array(31))).toThrow('哈希须为 32 字节')
    expect(() => rfc6979(priv1, hash1, hmacSha256, 0)).toThrow('最大尝试次数')
  })
  it('mock hmac 首次返回非法 k → 重试后成功', () => {
    let calls = 0
    const flaky: HmacSha256Fn = (key, data) => {
      calls += 1
      if (calls === 1) return new Uint8Array(32).fill(0xff) // 首轮 V 非法
      return hmacSha256(key, data)
    }
    const k = rfc6979(priv1, hash1, flaky, 10)
    expect(k >= 1n && k < SECP256K1_N).toBe(true)
  })
  it('mock hmac 恒返回非法 k → 耗尽抛错', () => {
    const bad: HmacSha256Fn = () => new Uint8Array(32).fill(0xff)
    expect(() => rfc6979(priv1, hash1, bad, 3)).toThrow('超过最大尝试次数')
  })
})

describe('assertValidRS', () => {
  it('合法通过', () => {
    expect(() => assertValidRS(1n, 1n)).not.toThrow()
  })
  it('越界抛错', () => {
    expect(() => assertValidRS(0n, 1n)).toThrow('超出范围')
    expect(() => assertValidRS(1n, 0n)).toThrow('超出范围')
    expect(() => assertValidRS(SECP256K1_N, 1n)).toThrow('超出范围')
    expect(() => assertValidRS(1n, SECP256K1_N)).toThrow('超出范围')
  })
})

describe('normalizeLowS', () => {
  it('高 S 翻转，低 S 不变', () => {
    expect(normalizeLowS(SECP256K1_N - 1n)).toBe(1n)
    expect(normalizeLowS(1n)).toBe(1n)
  })
  it('越界抛错', () => {
    expect(() => normalizeLowS(0n)).toThrow('超出范围')
    expect(() => normalizeLowS(SECP256K1_N)).toThrow('超出范围')
  })
})

describe('sign', () => {
  it('向量 1：r/s/v 全量一致', () => {
    const sig = sign(hexToBytes(V1.hash), V1.priv)
    expect(sig.r.toString(16).padStart(64, '0')).toBe(V1.r)
    expect(sig.s.toString(16).padStart(64, '0')).toBe(V1.s)
    expect(sig.v).toBe(V1.v)
  })
  it('向量 2：r/s/v 全量一致', () => {
    const sig = sign(hexToBytes(V2.hash), V2.priv)
    expect(sig.r.toString(16).padStart(64, '0')).toBe(V2.r)
    expect(sig.s.toString(16).padStart(64, '0')).toBe(V2.s)
    expect(sig.v).toBe(V2.v)
  })
  it('输出 s 为低 S 值', () => {
    const sig = sign(hexToBytes(V1.hash), V1.priv)
    expect(sig.s <= SECP256K1_N / 2n).toBe(true)
  })
  it('非法哈希长度抛错', () => {
    expect(() => sign(new Uint8Array(31), V1.priv)).toThrow('哈希须为 32 字节')
  })
  it('mock kFn 返回越界 k 抛错', () => {
    const badK: DeterministicKFn = () => 0n
    expect(() => sign(hexToBytes(V1.hash), V1.priv, badK)).toThrow('k 超出范围')
    const badK2: DeterministicKFn = () => SECP256K1_N
    expect(() => sign(hexToBytes(V1.hash), V1.priv, badK2)).toThrow('k 超出范围')
  })
  it('v=28 分支：mock k 找奇 y，签名→恢复往返', () => {
    // 找一个使 R.y 为奇数的 k（覆盖 v=28 分支）
    let sig = sign(hexToBytes(V1.hash), V1.priv, () => 1n)
    let k = 1n
    if (sig.v !== 28) {
      for (k = 2n; k < 50n; k += 1n) {
        sig = sign(hexToBytes(V1.hash), V1.priv, () => k)
        if (sig.v === 28) break
      }
    }
    expect(sig.v).toBe(28)
    const rec = recoverAddress(hexToBytes(V1.hash), sig.r, sig.s, sig.v)
    expect(rec).toBe(V1.address)
  })
})

describe('signatureToHex / parseSignatureHex', () => {
  it('往返', () => {
    const sig = sign(hexToBytes(V1.hash), V1.priv)
    const hex = signatureToHex(sig)
    expect(hex).toMatch(/^0x[0-9a-f]{130}$/)
    const parsed = parseSignatureHex(hex)
    expect(parsed.r).toBe(sig.r)
    expect(parsed.s).toBe(sig.s)
    expect(parsed.v).toBe(sig.v)
  })
  it('格式错误抛错', () => {
    expect(() => parseSignatureHex('0x1234')).toThrow('签名格式错误')
    const badV = `0x${V1.r}${V1.s}1d`
    expect(() => parseSignatureHex(badV)).toThrow('v 值错误')
    const zeroR = `0x${'00'.repeat(32)}${V1.s}1b`
    expect(() => parseSignatureHex(zeroR)).toThrow('超出范围')
  })
})

describe('ecrecover', () => {
  const hash1 = hexToBytes(V1.hash)
  const r1 = BigInt(`0x${V1.r}`)
  const s1 = BigInt(`0x${V1.s}`)
  it('向量 1 恢复公钥点', () => {
    const q = ecrecover(hash1, r1, s1, V1.v)
    const pub = privateToPublic(V1.priv)
    const body = pub.uncompressed.slice(2)
    expect(q.x.toString(16).padStart(64, '0')).toBe(body.slice(0, 64))
    expect(q.y.toString(16).padStart(64, '0')).toBe(body.slice(64))
  })
  it('v=28（奇偶翻转分支）恢复出不同点但不抛错', () => {
    const q = ecrecover(hash1, r1, s1, 28)
    const pub = privateToPublic(V1.priv)
    expect(q.x.toString(16).padStart(64, '0') + q.y.toString(16).padStart(64, '0')).not.toBe(
      pub.uncompressed.slice(2),
    )
  })
  it('r 不在曲线上抛错', () => {
    expect(() => ecrecover(hash1, 5n, s1, 27)).toThrow('不在 secp256k1 曲线上')
  })
  it('非法输入抛错', () => {
    expect(() => ecrecover(new Uint8Array(31), r1, s1, 27)).toThrow('哈希须为 32 字节')
    expect(() => ecrecover(hash1, r1, s1, 29)).toThrow('v 须为 27 或 28')
  })
  it('e ≡ 0（mod n）时 eG 为无穷远点分支', () => {
    const hashN = hexToBytes(SECP256K1_N.toString(16).padStart(64, '0'))
    const q = ecrecover(hashN, r1, s1, 27)
    expect(q.x >= 0n).toBe(true)
  })
  it('s·R = e·G 时点减为无穷远点抛错', () => {
    expect(() =>
      ecrecover(hexToBytes(VNULL.hash), BigInt(`0x${VNULL.r}`), BigInt(`0x${VNULL.s}`), VNULL.v),
    ).toThrow('无穷远点')
  })
})

describe('recoverAddress', () => {
  it('向量 1/2 恢复地址', () => {
    expect(recoverAddress(hexToBytes(V1.hash), BigInt(`0x${V1.r}`), BigInt(`0x${V1.s}`), V1.v)).toBe(
      V1.address,
    )
    const addr2 = publicToAddress(privateToPublic(V2.priv).uncompressed)
    expect(recoverAddress(hexToBytes(V2.hash), BigInt(`0x${V2.r}`), BigInt(`0x${V2.s}`), V2.v)).toBe(
      addr2,
    )
  })
})

describe('verifySignature', () => {
  const sigHex = signatureToHex(sign(hexToBytes(V1.hash), V1.priv))
  it('正确签名匹配', () => {
    const res = verifySignature(V1.address, V1.msg, sigHex)
    expect(res.match).toBe(true)
    expect(res.recovered).toBe(V1.address)
  })
  it('地址大小写不敏感', () => {
    const res = verifySignature(V1.address.toLowerCase(), V1.msg, sigHex)
    expect(res.match).toBe(true)
  })
  it('错误地址不匹配', () => {
    const res = verifySignature('0x0000000000000000000000000000000000000001', V1.msg, sigHex)
    expect(res.match).toBe(false)
  })
  it('消息被篡改不匹配', () => {
    const res = verifySignature(V1.address, 'hello!', sigHex)
    expect(res.match).toBe(false)
  })
  it('地址格式错误抛错', () => {
    expect(() => verifySignature('0x123', V1.msg, sigHex)).toThrow('地址格式错误')
  })
})

describe('底层椭圆曲线 helpers（分支补齐）', () => {
  const G = { x: SECP256K1_GX, y: SECP256K1_GY }
  const negG = { x: SECP256K1_GX, y: SECP256K1_P - SECP256K1_GY }

  it('modInv：可逆与不可逆', () => {
    expect(modInv(3n, 11n)).toBe(4n)
    expect(() => modInv(2n, 4n)).toThrow('模逆元不存在')
  })
  it('isOnCurve：真与假', () => {
    expect(isOnCurve(G)).toBe(true)
    expect(isOnCurve({ x: 1n, y: 1n })).toBe(false)
  })
  it('pointAdd：无穷远点 / 取反 / 加倍', () => {
    expect(pointAdd(null, G)).toEqual(G)
    expect(pointAdd(G, null)).toEqual(G)
    expect(pointAdd(G, negG)).toBeNull()
    expect(pointAdd(G, G)).toEqual(pointDouble(G))
  })
  it('pointMul：非法标量抛错', () => {
    expect(() => pointMul(0n)).toThrow('标量')
    expect(() => pointMul(SECP256K1_N)).toThrow('标量')
  })
  it('parsePrivateKeyHex 私钥解析：前文 sign 已覆盖，此处补私钥工具链', () => {
    const pub = privateToPublic(`0x${V1.priv}`)
    expect(pub.uncompressed).toHaveLength(130)
    expect(pub.compressed).toMatch(/^0[23][0-9a-f]{64}$/)
  })
  it('hexToBytes：奇数位 / 非法字符抛错', () => {
    expect(() => hexToBytes('abc')).toThrow('hex 格式错误')
    expect(() => hexToBytes('zz')).toThrow('hex 格式错误')
  })
  it('toChecksumAddress：EIP-55 已知值（带/不带 0x）', () => {
    const lower = '7e5f4552091a69125d5dfcb7b8c2659029395bdf'
    expect(toChecksumAddress(lower)).toBe(V1.address)
    expect(toChecksumAddress(`0x${lower}`)).toBe(V1.address)
  })
  it('publicToAddress：格式错误抛错', () => {
    expect(() => publicToAddress('0x1234')).toThrow('公钥格式错误')
    expect(() => publicToAddress(`0x05${'00'.repeat(64)}`)).toThrow('须以 04 开头')
  })
})

describe('parsePrivateKeyHex（分支补齐）', () => {
  it('格式 / 范围错误抛错，合法通过', () => {
    expect(() => parsePrivateKeyHex('0x1234')).toThrow('私钥格式错误')
    expect(() => parsePrivateKeyHex('00'.repeat(32))).toThrow('私钥数值无效')
    expect(() => parsePrivateKeyHex(SECP256K1_N.toString(16).padStart(64, '0'))).toThrow(
      '私钥数值无效',
    )
    expect(parsePrivateKeyHex(`0X${'00'.repeat(31)}01`)).toBe(1n)
  })
})
