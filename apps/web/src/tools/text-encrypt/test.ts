import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, fromBase64, toBase64, transform } from './utils'

describe('text-encrypt / base64', () => {
  it('往返一致', () => {
    const bytes = Uint8Array.from([1, 2, 3, 250])
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })

  it('非 base64 输入给出可读报错', () => {
    expect(() => fromBase64('!!!')).toThrow('不是合法的 base64')
  })

  it('空串给出可读报错', () => {
    expect(() => fromBase64('   ')).toThrow('密文为空')
  })
})

describe('text-encrypt / 加密解密', () => {
  it('加密后能解回原文', async () => {
    const packet = await encrypt('这是一段需要加密的明文。', 'secret')
    expect(packet).not.toContain('明文')
    await expect(decrypt(packet, 'secret')).resolves.toBe('这是一段需要加密的明文。')
  })

  it('口令不对时给出明确报错', async () => {
    const packet = await encrypt('abc', 'secret')
    await expect(decrypt(packet, 'wrong')).rejects.toThrow('解密失败')
  })

  it('同一明文两次加密结果不同（盐与 IV 随机）', async () => {
    const a = await encrypt('abc', 'secret')
    const b = await encrypt('abc', 'secret')
    expect(a).not.toBe(b)
  })

  it('缺口令时给出缺项提示', async () => {
    await expect(encrypt('abc', '')).rejects.toThrow('请先填写口令')
    await expect(decrypt('abc', '')).rejects.toThrow('请先填写口令')
  })

  it('密文被截断时给出可读报错', async () => {
    await expect(decrypt(toBase64(new Uint8Array(8)), 'secret')).rejects.toThrow('密文太短')
  })
})

describe('text-encrypt / transform', () => {
  const base = { mode: 'encrypt' } as const

  it('空输入返回空串', async () => {
    await expect(transform({ text: '  ', password: 'secret' }, base)).resolves.toBe('')
  })

  it('decrypt 模式走解密分支', async () => {
    const packet = await transform({ text: '明文', password: 'secret' }, base)
    await expect(
      transform({ text: packet, password: 'secret' }, { mode: 'decrypt' }),
    ).resolves.toBe('明文')
  })
})
