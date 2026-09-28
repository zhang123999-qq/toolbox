import { describe, expect, it } from 'vitest'
import {
  MAX_LINES,
  buildScatterOption,
  embedText,
  parseLabeledLines,
  pcaProject,
  powerIteration,
} from './utils'

describe('embedding-vis · utils', () => {
  it('embedText 确定性与归一化（与 #596 同算法）', () => {
    const v = embedText('苹果香蕉', 64)
    expect(v).toHaveLength(64)
    expect(embedText('苹果香蕉', 64)).toEqual(v)
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    expect(norm).toBeCloseTo(1, 10)
  })

  it('embedText 空文本 → 零向量；维度非法抛中文错', () => {
    expect(embedText('', 64).every((x) => x === 0)).toBe(true)
    expect(() => embedText('hi', 100)).toThrow('维度非法')
  })

  it('parseLabeledLines 中英文冒号与自动编号', () => {
    const out = parseLabeledLines('水果：苹果香蕉\n交通: 汽车火车\n纯文本行\n：只有内容')
    expect(out).toEqual([
      { label: '水果', text: '苹果香蕉' },
      { label: '交通', text: '汽车火车' },
      { label: '文本 3', text: '纯文本行' },
      { label: '文本 4', text: '只有内容' },
    ])
  })

  it('parseLabeledLines 冒号后无内容抛中文错', () => {
    expect(() => parseLabeledLines('标签：')).toThrow('第 1 行冒号后没有文本内容')
    expect(() => parseLabeledLines('ok\n标签:   ')).toThrow('第 2 行冒号后没有文本内容')
  })

  it('parseLabeledLines 空输入 / 非字符串抛中文错', () => {
    expect(() => parseLabeledLines('\n  \n')).toThrow('没有有效输入')
    expect(() => parseLabeledLines(undefined as never)).toThrow('输入必须是文本')
  })

  it('parseLabeledLines 超行数 / 单行超长抛中文错', () => {
    const many = new Array(MAX_LINES + 1).fill('a: b').join('\n')
    expect(() => parseLabeledLines(many)).toThrow('输入行数过多')
    expect(() => parseLabeledLines(`a: ${'x'.repeat(5001)}`)).toThrow('第 1 行过长')
  })

  it('powerIteration 对角矩阵求出主特征对', () => {
    const { value, vector } = powerIteration([
      [3, 0],
      [0, 1],
    ])
    expect(value).toBeCloseTo(3, 6)
    expect(Math.abs(vector[0])).toBeCloseTo(1, 6)
    expect(Math.abs(vector[1])).toBeCloseTo(0, 6)
  })

  it('powerIteration 零矩阵 → 特征值 0 与零向量', () => {
    const { value, vector } = powerIteration([
      [0, 0],
      [0, 0],
    ])
    expect(value).toBe(0)
    expect(vector).toEqual([0, 0])
  })

  it('powerIteration 空矩阵 / 非方阵抛中文错', () => {
    expect(() => powerIteration([])).toThrow('矩阵不能为空')
    expect(() =>
      powerIteration([
        [1, 2],
        [3, 4, 5],
      ]),
    ).toThrow('必须是方阵')
  })

  it('pcaProject 两簇向量在 PC1 上可分', () => {
    const pts = pcaProject([
      [1, 0.1],
      [1.1, -0.1],
      [-1, 0.1],
      [-1.1, -0.1],
    ])
    expect(pts).toHaveLength(4)
    const s = pts.map((p) => Math.sign(p.x))
    expect(s[0]).toBe(s[1])
    expect(s[2]).toBe(s[3])
    expect(s[0]).not.toBe(s[2])
    expect(s.every((v) => v !== 0)).toBe(true)
  })

  it('pcaProject 真实嵌入向量可投影且坐标有限', () => {
    const vecs = ['苹果香蕉橘子', '苹果香蕉草莓', '汽车火车飞机'].map((t) => embedText(t, 64))
    const pts = pcaProject(vecs)
    expect(pts).toHaveLength(3)
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
  })

  it('pcaProject 单样本 → 原点', () => {
    const pts = pcaProject([embedText('只有一条', 64)])
    expect(pts).toEqual([{ x: 0, y: 0, label: '' }])
  })

  it('pcaProject 完全相同文本 → 零方差全零', () => {
    const v = embedText('完全相同', 64)
    const pts = pcaProject([v, v, v])
    expect(pts.every((p) => p.x === 0 && p.y === 0)).toBe(true)
  })

  it('pcaProject 空列表 / 零维 / 维度不一致抛中文错', () => {
    expect(() => pcaProject([])).toThrow('向量列表不能为空')
    expect(() => pcaProject([[]])).toThrow('向量维度不能为 0')
    expect(() =>
      pcaProject([
        [1, 2],
        [1, 2, 3],
      ]),
    ).toThrow('维度必须一致')
  })

  it('buildScatterOption 生成散点 series', () => {
    const opt = buildScatterOption([
      { x: 1, y: 2, label: 'A' },
      { x: -1, y: 0.5, label: 'B' },
    ]) as { series: { type: string; data: { name: string; value: number[] }[] }[] }
    expect(opt.series[0]!.type).toBe('scatter')
    expect(opt.series[0]!.data).toEqual([
      { name: 'A', value: [1, 2] },
      { name: 'B', value: [-1, 0.5] },
    ])
  })

  it('buildScatterOption tooltip formatter 显示标签、缺失时为空', () => {
    const opt = buildScatterOption([{ x: 0, y: 0, label: 'A' }]) as {
      tooltip: { formatter: (p: { data?: { name?: string } }) => string }
    }
    const fmt = opt.tooltip.formatter
    expect(fmt({ data: { name: '标签' } })).toBe('标签')
    expect(fmt({ data: {} })).toBe('')
    expect(fmt({})).toBe('')
  })
})
