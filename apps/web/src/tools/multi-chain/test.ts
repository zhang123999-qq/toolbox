import { describe, expect, it } from 'vitest'
import {
  base58Decode,
  base58Encode,
  bytesToHex,
  convertAddress,
  convertAll,
  errorMessage,
  ethToTron,
  hexToBytes,
  sha256,
  tronToEth,
} from './utils'

/* TRON USDT TRC20 合约：公开已知的地址对（Python 独立实现交叉验证） */
const USDT_TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const USDT_ETH = '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c'

describe('multi-chain · sha256', () => {
  it('空串向量', () => {
    expect(bytesToHex(sha256(new Uint8Array(0)))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('"abc" 向量', () => {
    expect(bytesToHex(sha256(new TextEncoder().encode('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('长输入（跨多块）', () => {
    const data = new TextEncoder().encode('abc'.repeat(100))
    expect(bytesToHex(sha256(data))).toHaveLength(64)
    // 与短输入不同输入不同输出的基本 sanity
    expect(bytesToHex(sha256(data))).not.toBe(bytesToHex(sha256(new TextEncoder().encode('abc'))))
  })
})

describe('multi-chain · base58', () => {
  it('前导零编码为 1', () => {
    expect(base58Encode(new Uint8Array([0, 0, 1])).startsWith('11')).toBe(true)
  })

  it('编解码 round-trip', () => {
    const raw = hexToBytes('41a614f803b6fd780986a42c78ec9c7f77e6ded13c710277f5')
    expect(bytesToHex(base58Decode(base58Encode(raw)))).toBe(bytesToHex(raw))
  })

  it('空输入编解码', () => {
    expect(base58Encode(new Uint8Array(0))).toBe('')
  })

  it('非法字符报错', () => {
    expect(() => base58Decode('0OIl')).toThrow('base58 非法字符')
  })

  it('空字符串报错', () => {
    expect(() => base58Decode('   ')).toThrow('base58 输入为空')
  })
})

describe('multi-chain · hex 辅助', () => {
  it('hex 非法字符报错', () => {
    expect(() => hexToBytes('zz')).toThrow('hex 含非法字符')
  })

  it('hex 奇数长度报错', () => {
    expect(() => hexToBytes('abc')).toThrow('hex 长度必须为偶数')
  })

  it('支持 0X 大写前缀', () => {
    expect(bytesToHex(hexToBytes('0Xab'))).toBe('ab')
  })
})

describe('multi-chain · ethToTron', () => {
  it('USDT 已知地址对', () => {
    expect(ethToTron(USDT_ETH)).toBe(USDT_TRON)
  })

  it('无 0x 前缀与大写均可', () => {
    expect(ethToTron(USDT_ETH.slice(2).toUpperCase())).toBe(USDT_TRON)
  })

  it('零地址', () => {
    const t = ethToTron('0x0000000000000000000000000000000000000000')
    expect(t.startsWith('T')).toBe(true)
    expect(tronToEth(t)).toBe('0x0000000000000000000000000000000000000000')
  })

  it('非法 ETH 地址报错', () => {
    expect(() => ethToTron('0x1234')).toThrow('ETH 地址格式非法')
    expect(() => ethToTron('0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toThrow('ETH 地址格式非法')
  })
})

describe('multi-chain · tronToEth', () => {
  it('USDT 已知地址对', () => {
    expect(tronToEth(USDT_TRON)).toBe(USDT_ETH)
  })

  it('长度非法报错', () => {
    expect(() => tronToEth('1')).toThrow('TRON 地址长度非法')
  })

  it('校验和错误报错', () => {
    // 改最后一个字符破坏校验和
    const bad = USDT_TRON.slice(0, -1) + (USDT_TRON.endsWith('t') ? 'u' : 't')
    expect(() => tronToEth(bad)).toThrow('TRON 地址校验和错误')
  })

  it('前缀非法报错', () => {
    // 构造 25 字节但首字节非 0x41 的地址
    const raw = new Uint8Array(25)
    raw[0] = 0x42
    const addr = base58Encode(raw)
    expect(() => tronToEth(addr)).toThrow('TRON 地址前缀非法')
  })
})

describe('multi-chain · convertAddress', () => {
  it('auto 识别 ETH', () => {
    expect(convertAddress(USDT_ETH, 'auto').output).toBe(USDT_TRON)
  })

  it('auto 识别 TRON', () => {
    expect(convertAddress(USDT_TRON, 'auto').output).toBe(USDT_ETH)
  })

  it('显式方向', () => {
    expect(convertAddress(USDT_ETH, 'eth-to-tron').output).toBe(USDT_TRON)
    expect(convertAddress(USDT_TRON, 'tron-to-eth').output).toBe(USDT_ETH)
  })

  it('方向与格式不匹配时报错（不抛异常）', () => {
    const r = convertAddress(USDT_TRON, 'eth-to-tron')
    expect(r.error).toBeTruthy()
    expect(r.output).toBe('')
  })

  it('空行', () => {
    expect(convertAddress('  ', 'auto').error).toBe('空行')
  })

  it('非法输入行内报错', () => {
    const r = convertAddress('not-an-address', 'auto')
    expect(r.error).toBeTruthy()
    expect(r.output).toBe('')
  })
})

describe('multi-chain · errorMessage', () => {
  it('Error 取 message', () => {
    expect(errorMessage(new Error('oops'))).toBe('oops')
  })

  it('非 Error 取 String', () => {
    expect(errorMessage('boom')).toBe('boom')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('multi-chain · convertAll', () => {
  it('批量转换跳过空行', () => {
    const results = convertAll({ text: `${USDT_ETH}\n\n${USDT_TRON}\n` }, { direction: 'auto' })
    expect(results).toHaveLength(2)
    expect(results[0].output).toBe(USDT_TRON)
    expect(results[1].output).toBe(USDT_ETH)
  })

  it('错误行不中断整批', () => {
    const results = convertAll({ text: `${USDT_ETH}\nbad-line` }, { direction: 'auto' })
    expect(results).toHaveLength(2)
    expect(results[0].error).toBeUndefined()
    expect(results[1].error).toBeTruthy()
  })
})
