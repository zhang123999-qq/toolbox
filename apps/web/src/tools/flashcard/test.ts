/**
 * flashcard（#830）utils 单测：SM-2 间隔重复与牌组导入导出。
 */
import { describe, expect, it } from 'vitest'
import {
  deckStats,
  dueCards,
  exportDeckJson,
  gradeCard,
  importDeckCsv,
  importDeckJson,
  newCard,
} from './utils'

const NOW = 1700000000000

describe('newCard', () => {
  it('新建卡片初始值', () => {
    const c = newCard('apple', '苹果', NOW, 'c1')
    expect(c).toMatchObject({
      id: 'c1',
      front: 'apple',
      back: '苹果',
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      due: NOW,
    })
  })
  it('无 id 时自动生成', () => {
    expect(newCard('a', 'b', NOW).id).toMatch(/^card-/)
  })
  it('正反面为空抛中文错误', () => {
    expect(() => newCard('', 'b', NOW)).toThrow('正反面不能为空')
    expect(() => newCard('a', '  ', NOW)).toThrow('正反面不能为空')
  })
})

describe('gradeCard', () => {
  it('首次答对：间隔 1 天', () => {
    const c = gradeCard(newCard('a', 'b', NOW, 'c1'), 5, NOW)
    expect(c.interval).toBe(1)
    expect(c.repetitions).toBe(1)
    expect(c.due).toBe(NOW + 86400000)
  })
  it('第二次答对：间隔 6 天', () => {
    let c = newCard('a', 'b', NOW, 'c1')
    c = gradeCard(c, 4, NOW)
    c = gradeCard(c, 4, NOW)
    expect(c.interval).toBe(6)
    expect(c.repetitions).toBe(2)
  })
  it('第三次答对：间隔按 ease 放大', () => {
    let c = newCard('a', 'b', NOW, 'c1')
    c = gradeCard(c, 5, NOW)
    c = gradeCard(c, 5, NOW)
    const before = c
    c = gradeCard(c, 5, NOW)
    expect(c.interval).toBe(Math.round(6 * before.ease))
    expect(c.repetitions).toBe(3)
  })
  it('答错重置为 1 天', () => {
    let c = newCard('a', 'b', NOW, 'c1')
    c = gradeCard(c, 5, NOW)
    c = gradeCard(c, 2, NOW)
    expect(c.interval).toBe(1)
    expect(c.repetitions).toBe(0)
  })
  it('ease 有下限 1.3', () => {
    let c = newCard('a', 'b', NOW, 'c1')
    c = gradeCard(c, 0, NOW)
    c = gradeCard(c, 0, NOW)
    expect(c.ease).toBe(1.3)
  })
  it('答对后 ease 上升', () => {
    const c = gradeCard(newCard('a', 'b', NOW, 'c1'), 5, NOW)
    expect(c.ease).toBeGreaterThan(2.5)
  })
  it('原卡片不被修改（不可变）', () => {
    const c = newCard('a', 'b', NOW, 'c1')
    gradeCard(c, 5, NOW)
    expect(c.interval).toBe(0)
  })
  it.each([[-1], [6], [2.5], [NaN]])('非法评分 %s 抛中文错误', (q) => {
    expect(() => gradeCard(newCard('a', 'b', NOW, 'c1'), q, NOW)).toThrow('评分必须为 0–5 的整数')
  })
})

describe('dueCards / deckStats', () => {
  it('筛选到期卡片', () => {
    const deck = [
      newCard('a', 'b', NOW - 1000, 'c1'),
      gradeCard(newCard('c', 'd', NOW, 'c2'), 5, NOW),
    ]
    expect(dueCards(deck, NOW).map((c) => c.id)).toEqual(['c1'])
  })
  it('牌组统计', () => {
    const deck = [
      newCard('a', 'b', NOW - 1000, 'c1'),
      gradeCard(newCard('c', 'd', NOW, 'c2'), 5, NOW),
    ]
    expect(deckStats(deck, NOW)).toEqual({ total: 2, due: 1, fresh: 1 })
  })
})

describe('importDeckCsv', () => {
  it('正常导入', () => {
    const deck = importDeckCsv('apple,苹果\nbook,书', NOW)
    expect(deck).toHaveLength(2)
    expect(deck[0]).toMatchObject({ id: 'card-1', front: 'apple', back: '苹果' })
    expect(deck[1]).toMatchObject({ id: 'card-2', front: 'book', back: '书' })
  })
  it('背面可含逗号（按首个逗号切分）', () => {
    const deck = importDeckCsv('hi,你好，世界', NOW)
    expect(deck[0].back).toBe('你好，世界')
  })
  it('空内容抛中文错误', () => {
    expect(() => importDeckCsv('\n  \n', NOW)).toThrow('CSV 内容为空')
  })
  it('缺少逗号抛中文错误', () => {
    expect(() => importDeckCsv('apple', NOW)).toThrow('缺少逗号分隔')
  })
  it('空正面抛中文错误', () => {
    expect(() => importDeckCsv(',苹果', NOW)).toThrow('正反面不能为空')
  })
})

describe('exportDeckJson / importDeckJson', () => {
  it('导出后可重新导入', () => {
    const deck = importDeckCsv('apple,苹果', NOW)
    const json = exportDeckJson(deck)
    const back = importDeckJson(json)
    expect(back[0]).toMatchObject({ front: 'apple', back: '苹果' })
  })
  it('非法 JSON 抛中文错误', () => {
    expect(() => importDeckJson('{oops')).toThrow('JSON 格式无效')
  })
  it('非数组抛中文错误', () => {
    expect(() => importDeckJson('{}')).toThrow('必须为数组')
  })
  it('缺正反面的卡片抛中文错误', () => {
    expect(() => importDeckJson('[{"front":"a"}]')).toThrow('缺少正反面')
    expect(() => importDeckJson('[null]')).toThrow('缺少正反面')
  })
  it('缺失字段使用默认值', () => {
    const [c] = importDeckJson('[{"front":"a","back":"b"}]')
    expect(c.ease).toBe(2.5)
    expect(c.interval).toBe(0)
    expect(c.repetitions).toBe(0)
    expect(c.id).toBe('card-1')
  })
})
