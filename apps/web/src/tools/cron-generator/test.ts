import { describe, expect, it } from 'vitest'
import type { CronGeneratorOptions } from './schema'
import { buildCron, describe as describeGen, parseField, transform } from './utils'

const base: CronGeneratorOptions = { minute: '*', hour: '*', dom: '*', month: '*', dow: '*' }

describe('cron-generator / buildCron', () => {
  it('默认全星号 → 每分钟', () => {
    expect(buildCron(base)).toBe('* * * * *')
  })

  it('按选项拼接成 5 段表达式', () => {
    expect(buildCron({ ...base, minute: '0', hour: '2', dow: '1-5' })).toBe('0 2 * * 1-5')
  })

  it('非法字段报错', () => {
    expect(() => buildCron({ ...base, minute: '99' })).toThrow(/越界/)
    expect(() => buildCron({ ...base, hour: 'x' })).toThrow(/非法/)
    expect(() => buildCron({ ...base, hour: '-1' })).toThrow(/非法/)
    expect(() => buildCron({ ...base, minute: '1-2-3' })).toThrow(/非法/)
  })
})

describe('cron-generator / describe', () => {
  it('全星号 → 每分钟', () => {
    expect(describeGen(base)).toBe('每分钟')
  })

  it('工作日 02:00', () => {
    expect(describeGen({ ...base, minute: '0', hour: '2', dow: '1-5' })).toBe('周一到周五 02:00')
  })

  it('每月 1 号 00:00', () => {
    expect(describeGen({ ...base, minute: '0', hour: '0', dom: '1' })).toBe('每月 1 号 00:00')
  })

  it('每周一', () => {
    expect(describeGen({ ...base, minute: '0', hour: '0', dow: '1' })).toBe('每周一 00:00')
  })

  it('分钟为 *、小时固定 → 不泄漏原始星号', () => {
    expect(describeGen({ ...base, minute: '*', hour: '8' })).toBe('8 点每分钟')
  })

  it('小时为 *、分钟固定 → 每小时 X 分', () => {
    expect(describeGen({ ...base, minute: '30', hour: '*' })).toBe('每小时 30 分')
  })
})

describe('cron-generator / transform', () => {
  it('输出首行是表达式，随后是描述', () => {
    const out = transform({ text: 'generate' }, { ...base, minute: '0', hour: '2', dow: '1-5' })
    expect(out.startsWith('0 2 * * 1-5')).toBe(true)
    expect(out).toContain('# 描述')
    expect(out).toContain('周一到周五 02:00')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('parseField 基础能力', () => {
    expect([...parseField('*/15', 0, 59)]).toEqual([0, 15, 30, 45])
  })
})
