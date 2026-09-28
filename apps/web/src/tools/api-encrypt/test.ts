/**
 * api-encrypt（#758）utils 单测：PBKDF2 + AES-GCM 加解密（Node 真实 webcrypto，固定向量）。
 */
import { webcrypto } from 'node:crypto'
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  base64ToBytes,
  bytesToBase64,
  decryptText,
  defaultAesSubtle,
  defaultRandom,
  encryptText,
  parsePayload,
  type AesSubtleLike,
} from './utils'

afterEach(() => {
  vi.unstubAllGlobals()
})

const subtle = webcrypto.subtle as unknown as AesSubtleLike

// 由 Node webcrypto 独立计算的固定向量（password: test-password, 明文: hello world）
const FIXED_SALT = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
const FIXED_IV = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
const FIXED_PAYLOAD =
  '{"v":1,"kdf":"PBKDF2-SHA256","iter":100000,"salt":"AAECAwQFBgcICQoLDA0ODw==","iv":"AAECAwQFBgcICQoL","data":"6qQZIQt/IeOCkmNXy65pyJbiOPpkUD3q/SST"}'

describe('bytesToBase64 / base64ToBytes', () => {
  it('字节转 base64', () => {
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=')
  })
  it('合法 base64 解码', () => {
    expect(base64ToBytes('salt', 'aGk=')).toEqual(new Uint8Array([104, 105]))
  })
  it('长度非 4 倍数抛错', () => {
    expect(() => base64ToBytes('salt', 'abc')).toThrow('字段 salt 不是合法 Base64')
  })
  it('非法字符抛错', () => {
    expect(() => base64ToBytes('iv', '!!!===')).toThrow('字段 iv 不是合法 Base64')
  })
})

describe('defaultAesSubtle / defaultRandom', () => {
  it('返回可用的 subtle', () => {
    expect(typeof defaultAesSubtle().deriveKey).toBe('function')
  })
  it('无 WebCrypto 时抛错', () => {
    const orig = globalThis.crypto
    vi.stubGlobal('crypto', undefined)
    try {
      expect(() => defaultAesSubtle()).toThrow('不支持 WebCrypto')
    } finally {
      vi.stubGlobal('crypto', orig)
    }
  })
  it('返回可用的 random', () => {
    expect(typeof defaultRandom().getRandomValues).toBe('function')
  })
  it('无 getRandomValues 时抛错', () => {
    const orig = globalThis.crypto
    vi.stubGlobal('crypto', {})
    try {
      expect(() => defaultRandom()).toThrow('不支持 WebCrypto')
    } finally {
      vi.stubGlobal('crypto', orig)
    }
  })
})

describe('encryptText', () => {
  it('固定向量与独立计算一致', async () => {
    const out = await encryptText(
      { plaintext: 'hello world', password: 'test-password', salt: FIXED_SALT, iv: FIXED_IV },
      { subtle },
    )
    expect(out).toBe(FIXED_PAYLOAD)
  })
  it('随机 salt/iv 每次输出不同但可解密', async () => {
    const a = await encryptText({ plaintext: 'x', password: 'p' }, { subtle })
    const b = await encryptText({ plaintext: 'x', password: 'p' }, { subtle })
    expect(a).not.toBe(b)
    expect(await decryptText(a, 'p', subtle)).toBe('x')
  })
  it('空明文抛错', async () => {
    await expect(encryptText({ plaintext: '', password: 'p' }, { subtle })).rejects.toThrow(
      '请输入要加密的内容',
    )
  })
  it('空密码抛错', async () => {
    await expect(encryptText({ plaintext: 'x', password: '' }, { subtle })).rejects.toThrow(
      '请输入密码',
    )
  })
  it('迭代次数非法抛错', async () => {
    await expect(
      encryptText({ plaintext: 'x', password: 'p', iterations: 0 }, { subtle }),
    ).rejects.toThrow('迭代次数必须是正整数')
    await expect(
      encryptText({ plaintext: 'x', password: 'p', iterations: 1.5 }, { subtle }),
    ).rejects.toThrow('迭代次数必须是正整数')
  })
  it('缺省 deps 使用全局 WebCrypto', async () => {
    const out = await encryptText({ plaintext: 'x', password: 'p' })
    await expect(decryptText(out, 'p')).resolves.toBe('x')
  })
  it('注入 random 决定 salt/iv', async () => {
    const random = {
      getRandomValues: (arr: Uint8Array) => {
        arr.fill(7)
        return arr
      },
    }
    const out = await encryptText({ plaintext: 'x', password: 'p' }, { subtle, random })
    const p = parsePayload(out)
    expect(p.salt).toBe(bytesToBase64(new Uint8Array(16).fill(7)))
    expect(p.iv).toBe(bytesToBase64(new Uint8Array(12).fill(7)))
  })
})

describe('parsePayload', () => {
  it('非法 JSON 抛错', () => {
    expect(() => parsePayload('{')).toThrow('载荷不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parsePayload('42')).toThrow('载荷必须是 JSON 对象')
  })
  it('缺字段抛错', () => {
    expect(() => parsePayload('{"salt":"aGk=","iv":"aGk="}')).toThrow('载荷缺少字段：data')
    expect(() => parsePayload('{"salt":"","iv":"aGk=","data":"aGk="}')).toThrow(
      '载荷缺少字段：salt',
    )
  })
  it('迭代次数非法抛错', () => {
    expect(() => parsePayload('{"salt":"aGk=","iv":"aGk=","data":"aGk=","iter":-1}')).toThrow(
      '载荷迭代次数非法',
    )
    expect(() => parsePayload('{"salt":"aGk=","iv":"aGk=","data":"aGk=","iter":"x"}')).not.toThrow()
  })
  it('缺 iter 用默认 10 万', () => {
    const p = parsePayload('{"salt":"aGk=","iv":"aGk=","data":"aGk="}')
    expect(p.iter).toBe(100000)
  })
})

describe('decryptText', () => {
  it('固定向量解密成功', async () => {
    await expect(decryptText(FIXED_PAYLOAD, 'test-password', subtle)).resolves.toBe('hello world')
  })
  it('密码错误中文报错', async () => {
    await expect(decryptText(FIXED_PAYLOAD, 'wrong', subtle)).rejects.toThrow(
      '解密失败：密码错误或数据已损坏',
    )
  })
  it('数据被篡改中文报错', async () => {
    const tampered = FIXED_PAYLOAD.replace('6qQZIQt', '6qQZIQx')
    await expect(decryptText(tampered, 'test-password', subtle)).rejects.toThrow(
      '解密失败：密码错误或数据已损坏',
    )
  })
  it('空密码抛错', async () => {
    await expect(decryptText(FIXED_PAYLOAD, '', subtle)).rejects.toThrow('请输入密码')
  })
  it('非法 base64 字段抛错', async () => {
    const bad = FIXED_PAYLOAD.replace('AAECAwQFBgcICQoLDA0ODw==', '!!!')
    await expect(decryptText(bad, 'test-password', subtle)).rejects.toThrow(
      '字段 salt 不是合法 Base64',
    )
  })
  it('往返：中文与 emoji', async () => {
    const payload = await encryptText({ plaintext: '你好 🎉', password: 'p@ss' }, { subtle })
    await expect(decryptText(payload, 'p@ss', subtle)).resolves.toBe('你好 🎉')
  })
})
