import { describe, expect, it } from 'vitest'
import {
  buildFunnelOption,
  conversionRates,
  EXAMPLE_DATA,
  parseFunnelData,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { FunnelInput } from './schema'

const input = (o: Partial<FunnelInput>): FunnelInput => ({ text: '', ...o })

describe('funnel / parseFunnelData', () => {
  it('正常解析示例数据', () => {
    expect(parseFunnelData(EXAMPLE_DATA)).toEqual([
      { name: '访问', value: 10000 },
      { name: '注册', value: 3000 },
      { name: '下单', value: 800 },
      { name: '支付', value: 500 },
    ])
  })
  it('全角冒号自动归一化', () => {
    expect(parseFunnelData('访问：100\n注册：50')).toEqual([
      { name: '访问', value: 100 },
      { name: '注册', value: 50 },
    ])
  })
  it('空输入抛错', () => {
    expect(() => parseFunnelData('   ')).toThrow(/漏斗数据不能为空/)
  })
  it('空行抛错', () => {
    expect(() => parseFunnelData('访问:100\n\n注册:50')).toThrow(/不能为空行/)
  })
  it('无冒号抛错', () => {
    expect(() => parseFunnelData('访问100\n注册:50')).toThrow(/数据行格式非法/)
  })
  it('阶段名为空抛错', () => {
    expect(() => parseFunnelData(':100\n注册:50')).toThrow(/阶段名不能为空/)
  })
  it('阶段名重复抛错', () => {
    expect(() => parseFunnelData('访问:100\n访问:50')).toThrow(/阶段名重复/)
  })
  it('数值非数字抛错', () => {
    expect(() => parseFunnelData('访问:abc\n注册:50')).toThrow(/数值非法/)
  })
  it('数值负数抛错', () => {
    expect(() => parseFunnelData('访问:-1\n注册:50')).toThrow(/不能为负数/)
  })
  it('阶段不足 2 个抛错', () => {
    expect(() => parseFunnelData('访问:100')).toThrow(/至少需要 2 个阶段/)
  })
})

describe('funnel / conversionRates', () => {
  it('相对首阶段计算转化率（保留 1 位小数）', () => {
    const stages = parseFunnelData(EXAMPLE_DATA)
    expect(conversionRates(stages)).toEqual([100, 30, 8, 5])
  })
  it('首阶段为 0 时转化率记为 0', () => {
    expect(
      conversionRates([
        { name: 'a', value: 0 },
        { name: 'b', value: 5 },
      ]),
    ).toEqual([0, 0])
  })
})

describe('funnel / buildFunnelOption', () => {
  const stages = parseFunnelData(EXAMPLE_DATA)

  it('构建 funnel series 与数据', () => {
    const opt = buildFunnelOption(stages, '')
    const series = opt.series as Array<{ type: string; data: unknown[] }>
    expect(series[0].type).toBe('funnel')
    expect(series[0].data).toEqual([
      { name: '访问', value: 10000 },
      { name: '注册', value: 3000 },
      { name: '下单', value: 800 },
      { name: '支付', value: 500 },
    ])
  })
  it('空标题不带 title 字段', () => {
    expect(buildFunnelOption(stages, '')).not.toHaveProperty('title')
  })
  it('非空标题带 title 字段', () => {
    const opt = buildFunnelOption(stages, '转化漏斗')
    expect(opt.title).toEqual({ text: '转化漏斗', left: 'center' })
  })
  it('label formatter 输出阶段名、数值与转化率', () => {
    const opt = buildFunnelOption(stages, '')
    const series = opt.series as Array<{ label: { formatter: (p: unknown) => string } }>
    const formatter = series[0].label.formatter
    expect(formatter({ dataIndex: 1, name: '注册', value: 3000 })).toBe('注册\n3000（转化率 30%）')
    expect(formatter({ dataIndex: 0, name: '访问', value: 10000 })).toBe(
      '访问\n10000（转化率 100%）',
    )
  })
})

describe('funnel / parseTitle', () => {
  it('去首尾空白', () => {
    expect(parseTitle('  漏斗  ')).toBe('漏斗')
  })
  it('空串返回空串', () => {
    expect(parseTitle('   ')).toBe('')
  })
})

describe('funnel / parseSize', () => {
  it('留空回 fallback', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
  })
  it('正常解析', () => {
    expect(parseSize('800', '宽度', 600)).toBe(800)
  })
  it('非数字抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseSize('50', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
    expect(() => parseSize('2500', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
  })
})

describe('funnel / transform', () => {
  it('空输入用示例', () => {
    expect(transform(input({ text: '' }))).toBe(EXAMPLE_DATA)
  })
  it('非空输入去空白后返回', () => {
    expect(transform(input({ text: '  访问:1\n注册:2  ' }))).toBe('访问:1\n注册:2')
  })
})
