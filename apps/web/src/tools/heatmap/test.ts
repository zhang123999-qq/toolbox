import { describe, expect, it } from 'vitest'
import {
  buildHeatmapOption,
  EXAMPLE_DATA,
  parseHeatmapData,
  parseSize,
  parseTitle,
  transform,
} from './utils'

describe('heatmap / parseHeatmapData', () => {
  it('正常解析：类目按首次出现顺序编号', () => {
    const p = parseHeatmapData(EXAMPLE_DATA)
    expect(p.xCats).toEqual(['周一', '周二'])
    expect(p.yCats).toEqual(['上午', '下午'])
    expect(p.data).toEqual([
      [0, 0, 12],
      [0, 1, 30],
      [1, 0, 8],
      [1, 1, 25],
    ])
  })

  it('出现顺序晚的类目排后面', () => {
    const p = parseHeatmapData('周二, 下午, 2\n周一, 上午, 1\n周二, 上午, 3')
    expect(p.xCats).toEqual(['周二', '周一'])
    expect(p.yCats).toEqual(['下午', '上午'])
    expect(p.data).toEqual([
      [0, 0, 2],
      [1, 1, 1],
      [0, 1, 3],
    ])
  })

  it('空输入抛错', () => {
    expect(() => parseHeatmapData('')).toThrow(/数据不能为空/)
    expect(() => parseHeatmapData('  \n \r\n ')).toThrow(/数据不能为空/)
  })

  it('全角逗号自动归一', () => {
    const p = parseHeatmapData('周一，上午，12')
    expect(p.xCats).toEqual(['周一'])
    expect(p.yCats).toEqual(['上午'])
    expect(p.data).toEqual([[0, 0, 12]])
  })

  it('空行被忽略', () => {
    const p = parseHeatmapData('\n周一, 上午, 1\n\n周二, 下午, 2\n')
    expect(p.data).toEqual([
      [0, 0, 1],
      [1, 1, 2],
    ])
  })

  it('行不是恰好三列抛错', () => {
    expect(() => parseHeatmapData('只有两列')).toThrow(/每行须为 X类目/)
    expect(() => parseHeatmapData('a,b,c,d')).toThrow(/数据格式非法/)
  })

  it('X 类目为空抛错', () => {
    expect(() => parseHeatmapData(', 下午, 10')).toThrow(/类目不能为空/)
  })

  it('Y 类目为空抛错', () => {
    expect(() => parseHeatmapData('周一, , 10')).toThrow(/类目不能为空/)
  })

  it('数值非法抛错', () => {
    expect(() => parseHeatmapData('周一, 上午, abc')).toThrow(/数值非法/)
    expect(() => parseHeatmapData('周一, 上午, NaN')).toThrow(/数值非法/)
  })

  it('重复的数据点抛错', () => {
    expect(() => parseHeatmapData('周一, 上午, 1\n周一, 上午, 2')).toThrow(/重复的数据点/)
  })

  it('零与负数是合法数值', () => {
    const p = parseHeatmapData('周一, 上午, 0\n周二, 下午, -5')
    expect(p.data).toEqual([
      [0, 0, 0],
      [1, 1, -5],
    ])
  })

  it('单元格首尾空格被 trim', () => {
    const p = parseHeatmapData('  周一  ,  上午  ,  7  ')
    expect(p.xCats).toEqual(['周一'])
    expect(p.yCats).toEqual(['上午'])
    expect(p.data).toEqual([[0, 0, 7]])
  })
})

describe('heatmap / buildHeatmapOption', () => {
  it('标题为空时不加 title', () => {
    const option = buildHeatmapOption(parseHeatmapData(EXAMPLE_DATA), '')
    expect(option.title).toBeUndefined()
    expect(option.tooltip).toEqual({ position: 'top' })
    expect(option.grid).toEqual({ height: '60%', top: '10%' })
    const xAxis = option.xAxis as { type: string; data: readonly string[] }
    expect(xAxis).toMatchObject({ type: 'category', data: ['周一', '周二'] })
    const yAxis = option.yAxis as { type: string; data: readonly string[] }
    expect(yAxis).toMatchObject({ type: 'category', data: ['上午', '下午'] })
    expect(option.visualMap).toMatchObject({
      min: 8,
      max: 30,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
    })
    const series = option.series as { type: string; data: unknown[] }[]
    expect(series).toHaveLength(1)
    expect(series[0].type).toBe('heatmap')
    expect(series[0].data).toEqual([
      [0, 0, 12],
      [0, 1, 30],
      [1, 0, 8],
      [1, 1, 25],
    ])
  })

  it('标题非空时显示居中标题', () => {
    const option = buildHeatmapOption(parseHeatmapData(EXAMPLE_DATA), '周销量')
    expect(option.title).toEqual({ text: '周销量', left: 'center' })
  })

  it('单数据点时 min 与 max 相等', () => {
    const option = buildHeatmapOption(parseHeatmapData('A, B, 5'), '')
    expect(option.visualMap).toMatchObject({ min: 5, max: 5 })
  })
})

describe('heatmap / parseSize · parseTitle · transform', () => {
  it('尺寸：留空走默认，非法抛错，合法通过', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
    expect(parseSize('800', '宽度', 600)).toBe(800)
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
    expect(() => parseSize('50', '宽度', 600)).toThrow(/宽度须在 100–2000/)
    expect(() => parseSize('5000', '高度', 400)).toThrow(/高度须在 100–2000/)
  })

  it('标题 trim', () => {
    expect(parseTitle('  周销量  ')).toBe('周销量')
    expect(parseTitle('')).toBe('')
  })

  it('空输入用示例，非空原样返回', () => {
    expect(transform({ text: '' })).toBe(EXAMPLE_DATA)
    expect(transform({ text: '  ' })).toBe(EXAMPLE_DATA)
    expect(transform({ text: 'A, B, 1' })).toBe('A, B, 1')
  })
})
