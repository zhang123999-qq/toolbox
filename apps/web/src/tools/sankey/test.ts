import { describe, expect, it } from 'vitest'
import {
  buildSankeyOption,
  EXAMPLE_DATA,
  parseSankeyData,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { SankeyOptions } from './schema'

const opts = (o: Partial<SankeyOptions> = {}): SankeyOptions => ({
  title: '',
  width: '600',
  height: '400',
  ...o,
})

describe('sankey / parseTitle & parseSize', () => {
  it('标题去首尾空格，留空返回空串', () => {
    expect(parseTitle('  流量图  ')).toBe('流量图')
    expect(parseTitle('')).toBe('')
    expect(parseTitle('   ')).toBe('')
  })

  it('尺寸：留空走默认值，合法值原样返回', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
    expect(parseSize('  ', '高度', 400)).toBe(400)
    expect(parseSize('600', '宽度', 600)).toBe(600)
    expect(parseSize('100', '宽度', 600)).toBe(100)
    expect(parseSize('2000', '高度', 400)).toBe(2000)
  })

  it('尺寸非数字抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法：abc（须为数字）/)
  })

  it('尺寸越界抛错（下限 / 上限）', () => {
    expect(() => parseSize('10', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
    expect(() => parseSize('5000', '高度', 400)).toThrow(/高度须在 100–2000 之间/)
  })
})

describe('sankey / parseSankeyData', () => {
  it('示例数据解析：节点按首次出现顺序去重', () => {
    const parsed = parseSankeyData(EXAMPLE_DATA)
    expect(parsed.nodes.map((n) => n.name)).toEqual(['访问', '注册', '付费', '流失'])
    expect(parsed.links).toEqual([
      { source: '访问', target: '注册', value: 100 },
      { source: '注册', target: '付费', value: 30 },
      { source: '访问', target: '流失', value: 70 },
    ])
  })

  it('空输入（含纯空白）抛错', () => {
    expect(() => parseSankeyData('')).toThrow('数据不能为空（每行：源, 目标, 数值）')
    expect(() => parseSankeyData('   \n  \r\n ')).toThrow('数据不能为空')
  })

  it('列数不是 3 抛错（2 列 / 4 列）', () => {
    expect(() => parseSankeyData('只有两列')).toThrow(
      /数据格式非法：只有两列（每行须为 源, 目标, 数值）/,
    )
    expect(() => parseSankeyData('a,b,c,d')).toThrow(/每行须为 源, 目标, 数值/)
  })

  it('源为空抛错', () => {
    expect(() => parseSankeyData(',目标,10')).toThrow(/节点名不能为空：,目标,10/)
  })

  it('目标为空抛错', () => {
    expect(() => parseSankeyData('源,,10')).toThrow(/节点名不能为空：源,,10/)
  })

  it('源与目标相同抛错（不支持自环）', () => {
    expect(() => parseSankeyData('节点,节点,10')).toThrow(/源与目标不能相同：节点（不支持自环）/)
  })

  it('数值非数字抛错', () => {
    expect(() => parseSankeyData('a,b,abc')).toThrow(/数值非法：abc（须为大于 0 的数字）/)
  })

  it('数值非有限数字抛错（NaN / Infinity）', () => {
    expect(() => parseSankeyData('a,b,NaN')).toThrow(/数值非法：NaN/)
    expect(() => parseSankeyData('a,b,Infinity')).toThrow(/数值非法：Infinity/)
  })

  it('数值 0 与负数抛错', () => {
    expect(() => parseSankeyData('a,b,0')).toThrow(/数值非法：0（须为大于 0 的数字）/)
    expect(() => parseSankeyData('a,b,-5')).toThrow(/数值非法：-5/)
  })

  it('全角逗号自动归一', () => {
    const parsed = parseSankeyData('甲，乙，10')
    expect(parsed.links).toEqual([{ source: '甲', target: '乙', value: 10 }])
    expect(parsed.nodes.map((n) => n.name)).toEqual(['甲', '乙'])
  })

  it('首尾空格与空行被忽略，小数可解析', () => {
    const parsed = parseSankeyData('\n  甲 , 乙 , 2.5  \n\n')
    expect(parsed.links).toEqual([{ source: '甲', target: '乙', value: 2.5 }])
  })

  it('重复连线保留（节点不重复）', () => {
    const parsed = parseSankeyData('a,b,10\na,b,20')
    expect(parsed.nodes.map((n) => n.name)).toEqual(['a', 'b'])
    expect(parsed.links).toHaveLength(2)
  })
})

describe('sankey / buildSankeyOption', () => {
  const parsed = parseSankeyData(EXAMPLE_DATA)

  it('有标题时生成 title', () => {
    const option = buildSankeyOption(parsed, '流量')
    expect(option.title).toEqual({ text: '流量', left: 'center' })
  })

  it('无标题时不加 title', () => {
    const option = buildSankeyOption(parsed, '')
    expect(option.title).toBeUndefined()
  })

  it('tooltip 与 sankey 系列结构正确', () => {
    const option = buildSankeyOption(parsed, '')
    expect(option.tooltip).toEqual({ trigger: 'item' })
    const series = option.series as Record<string, unknown>[]
    expect(series).toHaveLength(1)
    expect(series[0].type).toBe('sankey')
    expect(series[0].data).toEqual([
      { name: '访问' },
      { name: '注册' },
      { name: '付费' },
      { name: '流失' },
    ])
    expect(series[0].links).toEqual([
      { source: '访问', target: '注册', value: 100 },
      { source: '注册', target: '付费', value: 30 },
      { source: '访问', target: '流失', value: 70 },
    ])
    expect(series[0].emphasis).toEqual({ focus: 'adjacency' })
    expect(series[0].lineStyle).toEqual({ color: 'source', curveness: 0.5 })
    expect(series[0].label).toEqual({ formatter: '{b}' })
  })
})

describe('sankey / transform', () => {
  it('空输入返回示例数据', () => {
    expect(transform({ text: '' }, opts())).toBe(EXAMPLE_DATA)
    expect(transform({ text: '   \n ' }, opts())).toBe(EXAMPLE_DATA)
  })

  it('非空输入原样返回（trim 后）', () => {
    expect(transform({ text: 'a,b,1' }, opts())).toBe('a,b,1')
  })
})
