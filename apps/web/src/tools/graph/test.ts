import { describe, expect, it } from 'vitest'
import {
  buildGraphOption,
  EXAMPLE_EDGES,
  EXAMPLE_NODES,
  parseGraphData,
  parseSize,
  parseTitle,
  resolveEdgeText,
  transform,
} from './utils'
import type { GraphInput } from './schema'

const input = (text: string, edgeText = ''): GraphInput => ({ text, edgeText })

describe('graph / parseGraphData · 节点解析', () => {
  it('正常解析节点名与类目', () => {
    const r = parseGraphData(EXAMPLE_NODES, '')
    expect(r.nodes).toEqual([
      { name: '张三', category: 0 },
      { name: '李四', category: 0 },
      { name: '王五', category: 1 },
      { name: '赵六', category: 2 },
    ])
    expect(r.categories).toEqual([{ name: '朋友' }, { name: '同事' }, { name: '未分类' }])
    expect(r.links).toEqual([])
  })

  it('全角冒号归一', () => {
    const r = parseGraphData('张三：朋友\n赵六：\n\n', '')
    expect(r.nodes[0]).toEqual({ name: '张三', category: 0 })
    expect(r.nodes[1]).toEqual({ name: '赵六', category: 1 })
    expect(r.categories).toEqual([{ name: '朋友' }, { name: '未分类' }])
  })

  it('类目为空冒号归入未分类', () => {
    const r = parseGraphData('张三:', '')
    expect(r.nodes[0].category).toBe(0)
    expect(r.categories).toEqual([{ name: '未分类' }])
  })

  it('无非空节点行抛错', () => {
    expect(() => parseGraphData('   \n', '')).toThrow(/节点不能为空/)
  })

  it('空节点名抛错', () => {
    expect(() => parseGraphData(':朋友', '')).toThrow(/节点名不能为空：:朋友/)
  })

  it('重复节点名抛错', () => {
    expect(() => parseGraphData('张三\n张三', '')).toThrow(/节点名重复：张三/)
  })
})

describe('graph / parseGraphData · 边解析', () => {
  it('正常解析边与权重', () => {
    const r = parseGraphData(EXAMPLE_NODES, EXAMPLE_EDGES)
    expect(r.links).toEqual([
      { source: '张三', target: '李四', value: 5 },
      { source: '李四', target: '王五', value: 2 },
      { source: '张三', target: '王五', value: 1 },
    ])
  })

  it('边行全角冒号归一', () => {
    const r = parseGraphData('张三\n李四', '张三 -> 李四：5')
    expect(r.links[0]).toEqual({ source: '张三', target: '李四', value: 5 })
  })

  it('边格式非法抛错（一段或三段）', () => {
    expect(() => parseGraphData('张三\n李四', '张三')).toThrow(/边格式非法/)
    expect(() => parseGraphData('张三\n李四', '张三 -> 李四 -> 王五')).toThrow(/边格式非法/)
  })

  it('端点为空抛错', () => {
    expect(() => parseGraphData('张三\n李四', ' -> 李四')).toThrow(/边端点不能为空/)
    expect(() => parseGraphData('张三\n李四', '张三 -> ')).toThrow(/边端点不能为空/)
  })

  it('权重为空抛错', () => {
    expect(() => parseGraphData('张三\n李四', '张三 -> 李四:')).toThrow(/边权重非法/)
  })

  it('权重非数字抛错', () => {
    expect(() => parseGraphData('张三\n李四', '张三 -> 李四:abc')).toThrow(/边权重非法/)
  })

  it('权重不大于 0 抛错', () => {
    expect(() => parseGraphData('张三\n李四', '张三 -> 李四:0')).toThrow(/边权重非法/)
    expect(() => parseGraphData('张三\n李四', '张三 -> 李四:-3')).toThrow(/边权重非法/)
  })

  it('引用未定义节点抛错（源 / 目标）', () => {
    expect(() => parseGraphData('张三\n李四', '未知 -> 张三')).toThrow(/边引用了未定义的节点：未知/)
    expect(() => parseGraphData('张三\n李四', '张三 -> 未知')).toThrow(/边引用了未定义的节点：未知/)
  })

  it('自环边抛错', () => {
    expect(() => parseGraphData('张三\n李四', '张三 -> 张三')).toThrow(/不支持自环边：张三/)
  })
})

describe('graph / buildGraphOption', () => {
  it('含标题时带 title，度越大节点越大', () => {
    const parsed = parseGraphData(EXAMPLE_NODES, EXAMPLE_EDGES)
    const opt = buildGraphOption(parsed, '关系图') as {
      title?: { text: string }
      legend: { data: string[] }
      series: Array<{
        type: string
        data: Array<{ name: string; symbolSize: number }>
        links: unknown[]
      }>
    }
    expect(opt.title?.text).toBe('关系图')
    expect(opt.legend.data).toEqual(['朋友', '同事', '未分类'])
    expect(opt.series[0].type).toBe('graph')
    const sizes = Object.fromEntries(opt.series[0].data.map((d) => [d.name, d.symbolSize]))
    expect(sizes['张三']).toBe(24 + 2 * 6) // 度 2（两条出边）
    expect(sizes['赵六']).toBe(24) // 孤立节点，度 0
    expect(opt.series[0].links).toHaveLength(3)
  })

  it('无标题时不带 title 键', () => {
    const parsed = parseGraphData(EXAMPLE_NODES, EXAMPLE_EDGES)
    const opt = buildGraphOption(parsed, '')
    expect(opt).not.toHaveProperty('title')
  })

  it('空边也能构建 option', () => {
    const parsed = parseGraphData('张三\n李四', '')
    const opt = buildGraphOption(parsed, '') as {
      series: Array<{ links: unknown[] }>
    }
    expect(opt.series[0].links).toEqual([])
  })
})

describe('graph / parseSize / parseTitle / transform / resolveEdgeText', () => {
  it('parseSize 默认值与合法值', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
    expect(parseSize('800', '宽度', 600)).toBe(800)
  })

  it('parseSize 非数字抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
  })

  it('parseSize 越界抛错（下 / 上）', () => {
    expect(() => parseSize('10', '宽度', 600)).toThrow(/宽度须在 100–2000/)
    expect(() => parseSize('5000', '高度', 400)).toThrow(/高度须在 100–2000/)
  })

  it('parseTitle 去空格', () => {
    expect(parseTitle('  关系图  ')).toBe('关系图')
    expect(parseTitle('')).toBe('')
  })

  it('transform 空输入回示例', () => {
    expect(transform(input('   '))).toBe(EXAMPLE_NODES)
    expect(transform(input('张三'))).toBe('张三')
  })

  it('resolveEdgeText 空输入回示例', () => {
    expect(resolveEdgeText('   ')).toBe(EXAMPLE_EDGES)
    expect(resolveEdgeText('张三 -> 李四')).toBe('张三 -> 李四')
  })
})
