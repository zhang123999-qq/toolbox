/**
 * chain-id-lookup（#715）utils 单测：十进制 / hex / 名称 / 符号查询、异常分支。
 */
import { describe, expect, it } from 'vitest'
import { CHAINS } from './chains'
import { chainIdToHex, formatChainInfo, formatResults, lookupChain } from './utils'

describe('chainIdToHex', () => {
  it('十进制转 hex', () => {
    expect(chainIdToHex(1)).toBe('0x1')
    expect(chainIdToHex(8453)).toBe('0x2105')
    expect(chainIdToHex(0)).toBe('0x0')
  })
  it('非法 ID 抛错', () => {
    expect(() => chainIdToHex(-1)).toThrow('非法')
    expect(() => chainIdToHex(1.5)).toThrow('非法')
    expect(() => chainIdToHex(Number.MAX_SAFE_INTEGER + 1)).toThrow('非法')
  })
})

describe('lookupChain 十进制与 hex', () => {
  it('十进制精确匹配', () => {
    const hits = lookupChain('1')
    expect(hits).toHaveLength(1)
    expect(hits[0].name).toBe('Ethereum Mainnet')
  })
  it('hex 精确匹配', () => {
    const hits = lookupChain('0x89')
    expect(hits).toHaveLength(1)
    expect(hits[0].name).toBe('Polygon')
  })
  it('hex 大小写不敏感', () => {
    expect(lookupChain('0xA')[0].name).toBe('Optimism')
  })
  it('十进制前后空格被 trim', () => {
    expect(lookupChain('  56  ')[0].name).toBe('BNB Smart Chain')
  })
  it('不存在的十进制抛错', () => {
    expect(() => lookupChain('99999999')).toThrow('未找到链 ID')
  })
  it('不存在的 hex 抛错', () => {
    expect(() => lookupChain('0xdeadbeef')).toThrow('未找到链 ID')
  })
  it('空输入抛错', () => {
    expect(() => lookupChain('')).toThrow('请输入')
    expect(() => lookupChain('   ')).toThrow('请输入')
  })
})

describe('lookupChain 名称与符号', () => {
  it('名称包含匹配（大小写不敏感）', () => {
    const hits = lookupChain('arbitrum')
    expect(hits.length).toBeGreaterThanOrEqual(2)
    expect(hits.every((c) => c.name.toLowerCase().includes('arbitrum'))).toBe(true)
  })
  it('代币符号精确匹配（大小写不敏感）', () => {
    const hits = lookupChain('avax')
    expect(hits.map((c) => c.name).sort()).toEqual(['Avalanche C-Chain', 'Avalanche Fuji'])
  })
  it('非 EVM 链可按名称查到', () => {
    const hits = lookupChain('solana')
    expect(hits).toHaveLength(1)
    expect(hits[0].kind).toBe('non-EVM')
  })
  it('无匹配抛错并回显查询串', () => {
    expect(() => lookupChain('不存在的链xyz')).toThrow('不存在的链xyz')
  })
})

describe('formatChainInfo / formatResults', () => {
  it('EVM 链含 hex 行', () => {
    const text = formatChainInfo(lookupChain('1')[0])
    expect(text).toContain('Ethereum Mainnet')
    expect(text).toContain('链 ID：1')
    expect(text).toContain('十六进制：0x1')
    expect(text).toContain('EVM 兼容链')
  })
  it('测试网标注', () => {
    expect(formatChainInfo(lookupChain('11155111')[0])).toContain('测试网')
  })
  it('非 EVM 链无 hex 行', () => {
    const text = formatChainInfo(lookupChain('tron')[0])
    expect(text).toContain('非 EVM 链')
    expect(text).not.toContain('十六进制')
  })
  it('多条结果用分隔线连接', () => {
    const text = formatResults(lookupChain('avax'))
    expect(text).toContain('---')
  })
})

describe('数据表完整性', () => {
  it('不少于 60 条', () => {
    expect(CHAINS.length).toBeGreaterThanOrEqual(60)
  })
  it('chainId 无重复', () => {
    const ids = CHAINS.map((c) => c.chainId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
