import { describe, expect, it } from 'vitest'
import {
  goReady,
  gradeReaction,
  recordReaction,
  resetReaction,
  startWait,
  tooSoon,
  type ReactionState,
} from './utils'

const rng0 = () => 0
const rngHalf = () => 0.5

describe('反应测试逻辑', () => {
  it('resetReaction：初始状态', () => {
    expect(resetReaction()).toEqual({ phase: 'idle', waitMs: 0, startMs: 0, reactionMs: null })
  })

  it('startWait：生成 1500-4500ms 随机等待（rng 可注入）', () => {
    expect(startWait(rng0).waitMs).toBe(1500)
    expect(startWait(rngHalf).waitMs).toBe(3000)
    const s = startWait(rng0)
    expect(s.phase).toBe('waiting')
    expect(s.reactionMs).toBeNull()
  })

  it('tooSoon：waiting 阶段点击判抢跑', () => {
    const r = tooSoon(startWait(rng0))
    expect(r.phase).toBe('foul')
    expect(r.reactionMs).toBeNull()
  })

  it('tooSoon：非 waiting 阶段原样返回', () => {
    const idle = resetReaction()
    expect(tooSoon(idle)).toBe(idle)
    const done: ReactionState = { phase: 'done', waitMs: 1500, startMs: 1000, reactionMs: 200 }
    expect(tooSoon(done)).toBe(done)
  })

  it('goReady：waiting 结束后进入 ready 并记录开始时间', () => {
    const r = goReady(startWait(rng0), 5000)
    expect(r.phase).toBe('ready')
    expect(r.startMs).toBe(5000)
  })

  it('goReady：非 waiting 阶段原样返回', () => {
    const idle = resetReaction()
    expect(goReady(idle, 1)).toBe(idle)
  })

  it('recordReaction：ready 阶段点击记录毫秒数', () => {
    const ready = goReady(startWait(rng0), 5000)
    const r = recordReaction(ready, 5230)
    expect(r.phase).toBe('done')
    expect(r.reactionMs).toBe(230)
  })

  it('recordReaction：点击早于开始时间按 0 计', () => {
    const ready = goReady(startWait(rng0), 5000)
    const r = recordReaction(ready, 4999)
    expect(r.reactionMs).toBe(0)
  })

  it('recordReaction：非 ready 阶段原样返回', () => {
    const waiting = startWait(rng0)
    expect(recordReaction(waiting, 9999)).toBe(waiting)
  })

  it('完整流程：等待 → 就绪 → 点击', () => {
    let s = startWait(rng0)
    s = goReady(s, 10000)
    s = recordReaction(s, 10250)
    expect(s.phase).toBe('done')
    expect(s.reactionMs).toBe(250)
    expect(gradeReaction(s.reactionMs as number)).toBe('良好')
  })

  it('gradeReaction：各档评级', () => {
    expect(gradeReaction(0)).toBe('超人级')
    expect(gradeReaction(149)).toBe('超人级')
    expect(gradeReaction(150)).toBe('优秀')
    expect(gradeReaction(249)).toBe('优秀')
    expect(gradeReaction(250)).toBe('良好')
    expect(gradeReaction(399)).toBe('良好')
    expect(gradeReaction(400)).toBe('一般')
    expect(gradeReaction(599)).toBe('一般')
    expect(gradeReaction(600)).toBe('需要练习')
    expect(gradeReaction(5000)).toBe('需要练习')
  })

  it('gradeReaction：负数抛中文错', () => {
    expect(() => gradeReaction(-1)).toThrow('反应时间不能为负数')
  })
})
