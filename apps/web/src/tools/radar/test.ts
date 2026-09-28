import { describe, expect, it } from 'vitest'
import {
  buildRadarOption,
  EXAMPLE_DATA,
  EXAMPLE_MAX,
  parseMaxIndicators,
  parseRadarData,
  parseSize,
  parseTitle,
  resolveMaxText,
  transform,
} from './utils'
import type { RadarInput } from './schema'

const input = (o: Partial<RadarInput>): RadarInput => ({ text: '', maxText: '', ...o })

describe('radar / parseMaxIndicators', () => {
  it('正常解析指标最大值', () => {
    const r = parseMaxIndicators('速度:100, 力量:80, 耐力:90')
    expect(r).toEqual([
      { name: '速度', max: 100 },
      { name: '力量', max: 80 },
      { name: '耐力', max: 90 },
    ])
  })
  it('全角标点自动归一化', () => {
    const r = parseMaxIndicators('速度：100，力量：80')
    expect(r).toEqual([
      { name: '速度', max: 100 },
      { name: '力量', max: 80 },
    ])
  })
  it('空输入抛错', () => {
    expect(() => parseMaxIndicators('   ')).toThrow(/指标最大值不能为空/)
  })
  it('单元无冒号抛错', () => {
    expect(() => parseMaxIndicators('速度100')).toThrow(/指标最大值格式非法/)
  })
  it('指标名为空抛错', () => {
    expect(() => parseMaxIndicators(':100')).toThrow(/指标名不能为空/)
  })
  it('指标名重复抛错', () => {
    expect(() => parseMaxIndicators('速度:100, 速度:80')).toThrow(/指标重复/)
  })
  it('最大值非数字抛错', () => {
    expect(() => parseMaxIndicators('速度:abc')).toThrow(/最大值非法/)
  })
  it('最大值 <=0 抛错', () => {
    expect(() => parseMaxIndicators('速度:0')).toThrow(/最大值非法/)
    expect(() => parseMaxIndicators('速度:-5')).toThrow(/最大值非法/)
  })
})

describe('radar / parseRadarData', () => {
  it('正常解析多系列数据，value 按指标顺序', () => {
    const r = parseRadarData(EXAMPLE_DATA, EXAMPLE_MAX)
    expect(r.indicators.map((i) => i.name)).toEqual(['速度', '力量', '耐力'])
    expect(r.series).toEqual([
      { name: '产品A', value: [80, 65, 90] },
      { name: '产品B', value: [60, 85, 70] },
    ])
  })
  it('数据行中指标顺序打乱仍按指标顺序组装', () => {
    const r = parseRadarData('产品A, 耐力:90, 速度:80, 力量:65', EXAMPLE_MAX)
    expect(r.series[0].value).toEqual([80, 65, 90])
  })
  it('全角标点自动归一化', () => {
    const r = parseRadarData('产品A，速度：80，力量：65，耐力：90', EXAMPLE_MAX)
    expect(r.series[0].value).toEqual([80, 65, 90])
  })
  it('空数据抛错', () => {
    expect(() => parseRadarData('   ', EXAMPLE_MAX)).toThrow(/雷达图数据不能为空/)
  })
  it('空数据行抛错', () => {
    expect(() =>
      parseRadarData(
        '产品A, 速度:80, 力量:65, 耐力:90\n\n产品B, 速度:60, 力量:85, 耐力:70',
        EXAMPLE_MAX,
      ),
    ).toThrow(/不能为空行/)
  })
  it('行少于两个单元抛错', () => {
    expect(() => parseRadarData('产品A', EXAMPLE_MAX)).toThrow(
      /至少需要「系列名, 指标:值」两个单元/,
    )
  })
  it('系列名重复抛错', () => {
    expect(() =>
      parseRadarData(
        '产品A, 速度:80, 力量:65, 耐力:90\n产品A, 速度:60, 力量:85, 耐力:70',
        EXAMPLE_MAX,
      ),
    ).toThrow(/系列名重复/)
  })
  it('单元无冒号抛错', () => {
    expect(() => parseRadarData('产品A, 速度80, 力量:65, 耐力:90', EXAMPLE_MAX)).toThrow(
      /单元格式非法/,
    )
  })
  it('未知指标抛错', () => {
    expect(() => parseRadarData('产品A, 速度:80, 力量:65, 体能:50', EXAMPLE_MAX)).toThrow(
      /未知指标/,
    )
  })
  it('系列内指标重复抛错', () => {
    expect(() => parseRadarData('产品A, 速度:80, 速度:60, 力量:65, 耐力:90', EXAMPLE_MAX)).toThrow(
      /指标重复/,
    )
  })
  it('值非数字抛错', () => {
    expect(() => parseRadarData('产品A, 速度:高, 力量:65, 耐力:90', EXAMPLE_MAX)).toThrow(
      /数值非法/,
    )
  })
  it('值小于 0 抛错', () => {
    expect(() => parseRadarData('产品A, 速度:-1, 力量:65, 耐力:90', EXAMPLE_MAX)).toThrow(
      /超出范围 0–100/,
    )
  })
  it('值大于最大值抛错', () => {
    expect(() => parseRadarData('产品A, 速度:101, 力量:65, 耐力:90', EXAMPLE_MAX)).toThrow(
      /超出范围 0–100/,
    )
  })
  it('系列缺少指标抛错', () => {
    expect(() => parseRadarData('产品A, 速度:80, 力量:65', EXAMPLE_MAX)).toThrow(/缺少指标/)
  })
  it('最大值输入非法时透出中文报错', () => {
    expect(() => parseRadarData(EXAMPLE_DATA, '')).toThrow(/指标最大值不能为空/)
  })
})

describe('radar / buildRadarOption', () => {
  it('带标题时设置 title', () => {
    const o = buildRadarOption(parseRadarData(EXAMPLE_DATA, EXAMPLE_MAX), '对比')
    expect(o.title).toMatchObject({ text: '对比', left: 'center' })
  })
  it('无标题时不含 title 字段', () => {
    const o = buildRadarOption(parseRadarData(EXAMPLE_DATA, EXAMPLE_MAX), '')
    expect('title' in o).toBe(false)
  })
  it('含 tooltip、底部 legend 与 radar indicator', () => {
    const o = buildRadarOption(parseRadarData(EXAMPLE_DATA, EXAMPLE_MAX), '')
    expect(o.tooltip).toEqual({})
    expect(o.legend).toMatchObject({ bottom: 0, data: ['产品A', '产品B'] })
    expect(o.radar).toEqual({
      indicator: [
        { name: '速度', max: 100 },
        { name: '力量', max: 100 },
        { name: '耐力', max: 100 },
      ],
    })
  })
  it('series 为单个 radar 系列，value 拷贝自解析结果', () => {
    const parsed = parseRadarData(EXAMPLE_DATA, EXAMPLE_MAX)
    const o = buildRadarOption(parsed, '')
    const s = (o.series as { type: string; data: { name: string; value: number[] }[] }[])[0]
    expect(s.type).toBe('radar')
    expect(s.data).toEqual([
      { name: '产品A', value: [80, 65, 90] },
      { name: '产品B', value: [60, 85, 70] },
    ])
    expect(s.data[0].value).not.toBe(parsed.series[0].value)
  })
})

describe('radar / parseSize & parseTitle', () => {
  it('默认值与合法值', () => {
    expect(parseTitle('  对比图  ')).toBe('对比图')
    expect(parseSize('', '宽度', 600)).toBe(600)
    expect(parseSize('800', '宽度', 600)).toBe(800)
  })
  it('非数字抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseSize('10', '宽度', 600)).toThrow(/宽度须在 100–2000/)
    expect(() => parseSize('5000', '高度', 400)).toThrow(/高度须在 100–2000/)
  })
})

describe('radar / transform & resolveMaxText', () => {
  it('空主输入返回示例数据', () => {
    expect(transform(input({ text: '   ' }))).toBe(EXAMPLE_DATA)
  })
  it('非空主输入原样返回', () => {
    expect(transform(input({ text: EXAMPLE_DATA }))).toBe(EXAMPLE_DATA)
  })
  it('空 maxText 返回示例指标最大值', () => {
    expect(resolveMaxText('   ')).toBe(EXAMPLE_MAX)
  })
  it('非空 maxText 原样返回', () => {
    expect(resolveMaxText('速度:50')).toBe('速度:50')
  })
})
