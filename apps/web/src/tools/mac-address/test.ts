import { describe, expect, it } from 'vitest'
import type { MacOptions } from './schema'
import { formatMac, lookupVendor, normalizeMac, randomMac, transform } from './utils'

const parseMode: MacOptions = { mode: 'parse' }
const genMode: MacOptions = { mode: 'generate' }

describe('mac-address / normalizeMac', () => {
  it('支持冒号 / 横杠 / 点分 / 紧凑四种写法', () => {
    expect(normalizeMac('AA:BB:CC:DD:EE:FF')).toBe('AABBCCDDEEFF')
    expect(normalizeMac('aa-bb-cc-dd-ee-ff')).toBe('AABBCCDDEEFF')
    expect(normalizeMac('aabb.ccdd.eeff')).toBe('AABBCCDDEEFF')
    expect(normalizeMac('AABBCCDDEEFF')).toBe('AABBCCDDEEFF')
  })

  it('非法格式抛错', () => {
    expect(() => normalizeMac('12:34')).toThrow(/12 位/)
    expect(() => normalizeMac('zz:zz:zz:zz:zz:zz')).toThrow(/12 位/)
  })
})

describe('mac-address / formatMac & vendor', () => {
  it('格式化冒号分隔', () => {
    expect(formatMac('AABBCCDDEEFF')).toBe('AA:BB:CC:DD:EE:FF')
  })

  it('树莓派 OUI 命中', () => {
    expect(lookupVendor('B827EB123456')).toBe('Raspberry Pi')
  })

  it('未收录厂商返回空串', () => {
    expect(lookupVendor('020000000000')).toBe('')
  })
})

describe('mac-address / transform', () => {
  it('解析模式输出标准形式与厂商', () => {
    const out = transform({ text: 'b8:27:eb:12:34:56' }, parseMode)
    expect(out).toContain('标准形式：B8:27:EB:12:34:56')
    expect(out).toContain('厂商：Raspberry Pi')
  })

  it('OUI 行只显示前 3 字节（不混入第 4 字节）', () => {
    const out = transform({ text: 'b8:27:eb:12:34:56' }, parseMode)
    expect(out).toContain('OUI：B8:27:EB')
    expect(out).not.toContain('OUI：B8:27:EB:12')
  })

  it('生成模式产出合法随机 MAC', () => {
    const out = transform({ text: '' }, genMode)
    expect(out).toMatch(/随机 MAC：([0-9A-F]{2}:){5}[0-9A-F]{2}/)
  })

  it('空输入在解析模式返回空串', () => {
    expect(transform({ text: '' }, parseMode)).toBe('')
  })

  it('解析模式非法 MAC 抛错', () => {
    expect(() => transform({ text: 'bad' }, parseMode)).toThrow(/12 位/)
  })

  it('randomMac 是 12 位 hex 且本地管理位置位', () => {
    const mac = randomMac()
    expect(mac).toMatch(/^[0-9A-F]{12}$/)
    expect(Number.parseInt(mac.slice(0, 2), 16) & 0x02).toBe(0x02)
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, parseMode)).toThrow(/上限/)
  })
})
