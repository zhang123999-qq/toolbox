/**
 * level-editor（#801）utils 单测：关卡对象层编辑。
 */
import { describe, expect, it } from 'vitest'
import {
  addObject,
  exportLevelJson,
  formatLevelObjects,
  importLevelJson,
  makeLevelObject,
  moveObject,
  removeObject,
  validateLevel,
  type LevelObject,
} from './utils'

const BOUNDS = { width: 100, height: 100 }

function goodObjects(): LevelObject[] {
  return [
    makeLevelObject('s1', 'spawn', 10, 10),
    makeLevelObject('e1', 'exit', 90, 90),
    makeLevelObject('m1', 'enemy', 50, 50, { hp: 100 }),
  ]
}

describe('makeLevelObject', () => {
  it('构造合法对象', () => {
    const o = makeLevelObject('a', 'item', 1, 2)
    expect(o).toEqual({ id: 'a', type: 'item', x: 1, y: 2 })
  })
  it('携带 props', () => {
    const o = makeLevelObject('a', 'trigger', 1, 2, { onEnter: 'win' })
    expect(o.props).toEqual({ onEnter: 'win' })
  })
  it('id 为空报错', () => {
    expect(() => makeLevelObject('', 'item', 1, 2)).toThrow('不能为空')
    expect(() => makeLevelObject(123 as unknown as string, 'item', 1, 2)).toThrow('不能为空')
  })
  it('非法类型报错', () => {
    expect(() => makeLevelObject('a', 'boss' as never, 1, 2)).toThrow('对象类型非法')
  })
  it('坐标非法报错', () => {
    expect(() => makeLevelObject('a', 'item', 'x' as unknown as number, 2)).toThrow('有限数字')
    expect(() => makeLevelObject('a', 'item', 1, Number.NaN)).toThrow('有限数字')
  })
  it('props 非对象报错', () => {
    expect(() =>
      makeLevelObject('a', 'item', 1, 2, ['x'] as unknown as Record<string, unknown>),
    ).toThrow('props')
    expect(() =>
      makeLevelObject('a', 'item', 1, 2, null as unknown as Record<string, unknown>),
    ).toThrow('props')
  })
})

describe('addObject / removeObject / moveObject', () => {
  it('添加对象', () => {
    const next = addObject([], makeLevelObject('a', 'item', 1, 1))
    expect(next).toHaveLength(1)
  })
  it('重复 id 报错', () => {
    const objs = [makeLevelObject('a', 'item', 1, 1)]
    expect(() => addObject(objs, makeLevelObject('a', 'item', 2, 2))).toThrow('已存在')
  })
  it('删除对象', () => {
    const objs = [makeLevelObject('a', 'item', 1, 1), makeLevelObject('b', 'item', 2, 2)]
    expect(removeObject(objs, 'a').map((o) => o.id)).toEqual(['b'])
  })
  it('删除不存在的 id 报错', () => {
    expect(() => removeObject([], 'nope')).toThrow('不存在')
  })
  it('移动对象', () => {
    const objs = [makeLevelObject('a', 'item', 1, 1), makeLevelObject('b', 'item', 2, 2)]
    const next = moveObject(objs, 'a', 9, 8)
    expect(next[0].x).toBe(9)
    expect(next[0].y).toBe(8)
    expect(next[1]).toEqual(objs[1]) // 未命中的对象原样保留
    expect(objs[0].x).toBe(1) // 不修改原数组
  })
  it('移动不存在的 id 报错', () => {
    expect(() => moveObject([], 'nope', 1, 1)).toThrow('不存在')
  })
  it('移动坐标非法报错', () => {
    const objs = [makeLevelObject('a', 'item', 1, 1)]
    expect(() => moveObject(objs, 'a', Number.NaN, 1)).toThrow('有限数字')
  })
})

describe('validateLevel', () => {
  it('合法关卡通过', () => {
    expect(validateLevel(goodObjects(), BOUNDS)).toEqual([])
  })
  it('缺少出生点', () => {
    const objs = goodObjects().filter((o) => o.type !== 'spawn')
    expect(validateLevel(objs, BOUNDS)).toContain('缺少出生点（spawn）')
  })
  it('多个出生点', () => {
    const objs = [...goodObjects(), makeLevelObject('s2', 'spawn', 20, 20)]
    expect(validateLevel(objs, BOUNDS)).toContain('出生点（spawn）只能有 1 个')
  })
  it('缺少出口', () => {
    const objs = goodObjects().filter((o) => o.type !== 'exit')
    expect(validateLevel(objs, BOUNDS)).toContain('缺少出口（exit）')
  })
  it('对象越界', () => {
    const objs = [...goodObjects(), makeLevelObject('o1', 'item', 101, 50)]
    const issues = validateLevel(objs, BOUNDS)
    expect(issues.some((i) => i.includes('o1') && i.includes('越界'))).toBe(true)
  })
  it('关卡尺寸非法报错', () => {
    expect(() => validateLevel([], { width: 0, height: 100 })).toThrow('正数')
    expect(() => validateLevel([], { width: Number.NaN, height: 100 })).toThrow('有限数字')
  })
})

describe('exportLevelJson / importLevelJson', () => {
  it('导出导入往返一致', () => {
    const objs = goodObjects()
    const back = importLevelJson(exportLevelJson(objs))
    expect(back).toEqual(objs)
  })
  it('非法 JSON 报错', () => {
    expect(() => importLevelJson('xxx')).toThrow('合法 JSON')
  })
  it('非数组报错', () => {
    expect(() => importLevelJson('{"a":1}')).toThrow('对象数组')
  })
  it('数组元素非对象报错', () => {
    expect(() => importLevelJson('[1]')).toThrow('第 1 个对象不是合法对象')
  })
  it('元素字段非法报错', () => {
    expect(() => importLevelJson('[{"id":"a","type":"boss","x":1,"y":2}]')).toThrow('对象类型非法')
  })
})

describe('formatLevelObjects', () => {
  it('空关卡', () => {
    expect(formatLevelObjects([])).toBe('关卡为空')
  })
  it('格式化列表', () => {
    const s = formatLevelObjects([makeLevelObject('s1', 'spawn', 10, 10)])
    expect(s).toContain('s1 [spawn] @(10, 10)')
  })
})
