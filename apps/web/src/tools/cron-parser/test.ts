import { describe, expect, it } from 'vitest'
import { describeCron, parseField } from './utils'

describe('cron-parser / parseField', () => {
  it('`*` 命中整段范围', () => {
    expect(parseField('*', 0, 59).size).toBe(60)
  })

  it('`*/N` 命中所有 N 的倍数', () => {
    expect([...parseField('*/15', 0, 59)]).toEqual([0, 15, 30, 45])
  })

  it('区间与列表：`a-b`、`a,b,c`、`a-b/N`', () => {
    expect([...parseField('1-5', 0, 23)]).toEqual([1, 2, 3, 4, 5])
    expect([...parseField('0,30,45', 0, 59)]).toEqual([0, 30, 45])
    expect([...parseField('0-30/10', 0, 59)]).toEqual([0, 10, 20, 30])
  })

  it('越界与非法步长报错', () => {
    expect(() => parseField('60', 0, 59)).toThrow(/越界/)
    expect(() => parseField('10-5', 0, 59)).toThrow(/越界/)
    expect(() => parseField('*/0', 0, 59)).toThrow(/步长/)
  })

  it('畸形区间被拒绝（前导负号 / 多段横杠）', () => {
    expect(() => parseField('-1', 0, 59)).toThrow(/非法/)
    expect(() => parseField('1-2-3', 0, 59)).toThrow(/非法/)
  })
})

describe('cron-parser / describeCron', () => {
  it('工作日凌晨 2 点 → 周一到周五 02:00', () => {
    expect(describeCron('0 2 * * 1-5')).toBe('周一到周五 02:00')
  })

  it('每 15 分钟', () => {
    expect(describeCron('*/15 * * * *')).toBe('每 15 分钟')
  })

  it('每小时整点 / 每小时固定分（小时为 *，分钟单值）', () => {
    expect(describeCron('0 * * * *')).toBe('每小时整点')
    expect(describeCron('30 * * * *')).toBe('每小时 30 分')
  })

  it('每月 1 号 00:00', () => {
    expect(describeCron('0 0 1 * *')).toBe('每月 1 号 00:00')
  })

  it('每天 08:30', () => {
    expect(describeCron('30 8 * * *')).toBe('08:30')
  })

  it('每周日 00:00', () => {
    expect(describeCron('0 0 * * 0')).toBe('每周日 00:00')
  })

  it('工作日 9 点到 18 点每 10 分钟', () => {
    expect(describeCron('*/10 9-18 * * 1-5')).toBe('周一到周五 9-18 点 每 10 分钟')
  })

  it('空输入返回空串（边界）', () => {
    expect(describeCron('')).toBe('')
    expect(describeCron('   ')).toBe('')
  })

  it('字段数不对与非法字段报错', () => {
    expect(() => describeCron('0 2 * *')).toThrow(/5 段/)
    expect(() => describeCron('0 2 * * 8')).toThrow(/越界/)
  })
})
