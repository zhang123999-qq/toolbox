/**
 * animation-frame（#797）utils 单测：动画帧。
 */
import { describe, expect, it } from 'vitest'
import {
  addFrame,
  createClip,
  exportClipJson,
  frameAtTime,
  importClipJson,
  removeFrame,
  reorderFrames,
  totalDuration,
} from './utils'

describe('createClip', () => {
  it('创建空片段', () => {
    const c = createClip('跑步')
    expect(c.name).toBe('跑步')
    expect(c.frames).toEqual([])
    expect(c.loop).toBe(true)
  })
  it('默认名称', () => {
    expect(createClip().name).toBe('未命名动画')
  })
  it('空名称报错', () => {
    expect(() => createClip('  ')).toThrow('片段名称不能为空')
  })
})

describe('addFrame', () => {
  it('追加帧并返回新对象', () => {
    const c = createClip()
    const c2 = addFrame(c, { spriteId: 'run1', durationMs: 100 })
    expect(c.frames).toHaveLength(0)
    expect(c2.frames).toHaveLength(1)
    expect(c2.frames[0]).toEqual({ spriteId: 'run1', durationMs: 100 })
  })
  it('spriteId 去除首尾空格', () => {
    const c = addFrame(createClip(), { spriteId: '  a  ', durationMs: 50 })
    expect(c.frames[0].spriteId).toBe('a')
  })
  it('非法帧报错', () => {
    const c = createClip()
    expect(() => addFrame(c, { spriteId: '', durationMs: 100 })).toThrow('spriteId 不能为空')
    expect(() => addFrame(c, { spriteId: 'a', durationMs: 0 })).toThrow('帧时长')
    expect(() => addFrame(c, { spriteId: 'a', durationMs: 60001 })).toThrow('帧时长')
    expect(() => addFrame(c, { spriteId: 'a', durationMs: 12.5 })).toThrow('帧时长')
    expect(() => addFrame(c, { spriteId: 'x'.repeat(101), durationMs: 100 })).toThrow('100 字符')
    expect(() => addFrame(c, null as never)).toThrow('帧必须是对象')
  })
})

describe('removeFrame', () => {
  it('删除指定帧', () => {
    let c = createClip()
    c = addFrame(c, { spriteId: 'a', durationMs: 100 })
    c = addFrame(c, { spriteId: 'b', durationMs: 100 })
    const c2 = removeFrame(c, 0)
    expect(c2.frames.map((f) => f.spriteId)).toEqual(['b'])
    expect(c.frames).toHaveLength(2)
  })
  it('越界报错', () => {
    const c = addFrame(createClip(), { spriteId: 'a', durationMs: 100 })
    expect(() => removeFrame(c, 1)).toThrow('越界')
    expect(() => removeFrame(c, -1)).toThrow('越界')
  })
})

describe('reorderFrames', () => {
  it('移动帧位置', () => {
    let c = createClip()
    for (const id of ['a', 'b', 'c']) c = addFrame(c, { spriteId: id, durationMs: 100 })
    const c2 = reorderFrames(c, 0, 2)
    expect(c2.frames.map((f) => f.spriteId)).toEqual(['b', 'c', 'a'])
  })
  it('同位置返回原对象', () => {
    const c = addFrame(createClip(), { spriteId: 'a', durationMs: 100 })
    expect(reorderFrames(c, 0, 0)).toBe(c)
  })
  it('索引越界报错', () => {
    const c = addFrame(createClip(), { spriteId: 'a', durationMs: 100 })
    expect(() => reorderFrames(c, 5, 0)).toThrow('越界')
    expect(() => reorderFrames(c, 0, 5)).toThrow('越界')
  })
})

describe('totalDuration / frameAtTime', () => {
  function twoFrames(loop: boolean) {
    let c = createClip()
    c = addFrame(c, { spriteId: 'a', durationMs: 100 })
    c = addFrame(c, { spriteId: 'b', durationMs: 200 })
    return { ...c, loop }
  }
  it('总时长累加', () => {
    expect(totalDuration(twoFrames(true))).toBe(300)
    expect(totalDuration(createClip())).toBe(0)
  })
  it('循环取模定位', () => {
    const c = twoFrames(true)
    expect(frameAtTime(c, 0)).toBe(0)
    expect(frameAtTime(c, 99)).toBe(0)
    expect(frameAtTime(c, 100)).toBe(1)
    expect(frameAtTime(c, 299)).toBe(1)
    expect(frameAtTime(c, 300)).toBe(0)
    expect(frameAtTime(c, 450)).toBe(1)
  })
  it('非循环钳制到末帧', () => {
    const c = twoFrames(false)
    expect(frameAtTime(c, 1000)).toBe(1)
    expect(frameAtTime(c, 299)).toBe(1)
  })
  it('负时间按 0 处理', () => {
    expect(frameAtTime(twoFrames(true), -50)).toBe(0)
  })
  it('空片段报错', () => {
    expect(() => frameAtTime(createClip(), 0)).toThrow('没有帧')
  })
})

describe('exportClipJson / importClipJson', () => {
  it('导出导入往返一致', () => {
    let c = createClip('跳')
    c = addFrame(c, { spriteId: 'j1', durationMs: 120 })
    const back = importClipJson(exportClipJson(c))
    expect(back).toEqual(c)
  })
  it('非法 JSON 报错', () => {
    expect(() => importClipJson('{oops')).toThrow('JSON 解析失败')
  })
  it('非对象报错', () => {
    expect(() => importClipJson('[]')).toThrow('必须是对象')
  })
  it('缺字段报错', () => {
    expect(() => importClipJson('{"name":"x","frames":[],"loop":"yes"}')).toThrow('布尔值')
    expect(() => importClipJson('{"name":"","frames":[]}')).toThrow('名称不能为空')
    expect(() => importClipJson('{"name":"x","frames":{}}')).toThrow('数组')
    expect(() =>
      importClipJson('{"name":"x","frames":[{"spriteId":"a","durationMs":0}],"loop":true}'),
    ).toThrow('帧时长')
  })
})
