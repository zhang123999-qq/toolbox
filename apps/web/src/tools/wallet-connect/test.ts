import { describe, expect, it, vi } from 'vitest'
import {
  connectWallet,
  detectProviders,
  errorMessage,
  formatWeiToEther,
  getWalletInfo,
  type Eip1193Provider,
} from './utils'

function mockProvider(impl?: (method: string) => unknown): Eip1193Provider {
  return {
    request: vi.fn(async ({ method, params }: { method: string; params?: unknown[] }) => {
      if (impl) return impl(method)
      switch (method) {
        case 'eth_requestAccounts':
          return ['0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf']
        case 'eth_chainId':
          return '0x1'
        case 'eth_getBalance':
          return '0xde0b6b3a7640000'
        default:
          throw new Error('未知方法：' + method + ' params=' + JSON.stringify(params))
      }
    }),
  }
}

describe('wallet-connect · errorMessage', () => {
  it('Error 取 message', () => {
    expect(errorMessage(new Error('oops'))).toBe('oops')
  })

  it('非 Error 取 String', () => {
    expect(errorMessage('boom')).toBe('boom')
  })
})

describe('wallet-connect · detectProviders', () => {
  it('无 window 时返回空数组', () => {
    expect(detectProviders(() => undefined)).toEqual([])
    expect(detectProviders(() => null)).toEqual([])
  })

  it('getWindow 抛错时返回空数组', () => {
    expect(
      detectProviders(() => {
        throw new Error('nope')
      }),
    ).toEqual([])
  })

  it('无 ethereum 时返回空数组', () => {
    expect(detectProviders(() => ({}))).toEqual([])
    expect(detectProviders(() => ({ ethereum: null }))).toEqual([])
  })

  it('单个 provider', () => {
    const p = mockProvider()
    const list = detectProviders(() => ({ ethereum: p }))
    expect(list).toHaveLength(1)
    expect(list[0]).toBe(p)
  })

  it('多钱包 providers 数组', () => {
    const a = mockProvider()
    const b = mockProvider()
    const list = detectProviders(() => ({ ethereum: { providers: [a, b] } }))
    expect(list).toHaveLength(2)
    expect(list[0]).toBe(a)
    expect(list[1]).toBe(b)
  })

  it('空 providers 数组回退到自身', () => {
    const eth = { providers: [] as Eip1193Provider[] }
    const list = detectProviders(() => ({ ethereum: eth }))
    expect(list).toHaveLength(1)
  })
})

describe('wallet-connect · connectWallet', () => {
  it('返回账户列表', async () => {
    const accounts = await connectWallet(mockProvider())
    expect(accounts).toEqual(['0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'])
  })

  it('用户拒绝时中文报错', async () => {
    const p = mockProvider(() => {
      throw new Error('User rejected')
    })
    await expect(connectWallet(p)).rejects.toThrow('钱包连接被拒绝或失败')
  })

  it('空账户列表报错', async () => {
    const p = mockProvider(() => [])
    await expect(connectWallet(p)).rejects.toThrow('钱包未返回任何账户')
  })

  it('非字符串账户报错', async () => {
    const p = mockProvider(() => [123])
    await expect(connectWallet(p)).rejects.toThrow('钱包未返回任何账户')
  })
})

describe('wallet-connect · formatWeiToEther', () => {
  it('1 ETH', () => {
    expect(formatWeiToEther('0xde0b6b3a7640000')).toBe('1')
  })

  it('0', () => {
    expect(formatWeiToEther('0x0')).toBe('0')
  })

  it('小数（0.5 ETH）', () => {
    expect(formatWeiToEther('0x6f05b59d3b20000')).toBe('0.5')
  })

  it('无 0x 前缀', () => {
    expect(formatWeiToEther('de0b6b3a7640000')).toBe('1')
  })

  it('非法余额报错', () => {
    expect(() => formatWeiToEther('xyz')).toThrow('余额格式非法')
    expect(() => formatWeiToEther('')).toThrow('余额格式非法')
  })
})

describe('wallet-connect · getWalletInfo', () => {
  it('读取链 ID 与余额', async () => {
    const info = await getWalletInfo(mockProvider(), '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
    expect(info.chainId).toBe(1)
    expect(info.balanceWei).toBe('1000000000000000000')
    expect(info.balanceEther).toBe('1')
    expect(info.address).toBe('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })

  it('request 失败时中文报错', async () => {
    const p = mockProvider(() => {
      throw new Error('boom')
    })
    await expect(getWalletInfo(p, '0x0')).rejects.toThrow('读取钱包信息失败')
  })

  it('chainId 非法报错', async () => {
    const p = mockProvider((m) => (m === 'eth_chainId' ? 'not-hex' : '0x0'))
    await expect(getWalletInfo(p, '0x0')).rejects.toThrow('chainId 格式非法')
  })

  it('余额非法报错', async () => {
    const p = mockProvider((m) => (m === 'eth_chainId' ? '0x1' : 'oops'))
    await expect(getWalletInfo(p, '0x0')).rejects.toThrow('余额格式非法')
  })
})
