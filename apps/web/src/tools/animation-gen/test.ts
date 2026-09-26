import { describe, expect, it } from 'vitest'
import { assertName, assertTime, buildAnimation, splitDecls, transform } from './utils'
import type { AnimationGenOptions } from './schema'

const base: AnimationGenOptions = {
  name: 'fadeIn',
  duration: '1s',
  timing: 'ease',
  delay: '0s',
  iteration: 'infinite',
  direction: 'normal',
  from: 'opacity: 0',
  to: 'opacity: 1',
}

describe('animation-gen / assertName', () => {
  it('空名回退 fadeIn，非法名抛错', () => {
    expect(assertName('')).toBe('fadeIn')
    expect(assertName('fade-in')).toBe('fade-in')
    expect(() => assertName('1bad')).toThrow(/动画名格式非法/)
  })
})

describe('animation-gen / assertTime', () => {
  it('空值为 0s，合法时间通过', () => {
    expect(assertTime('', 'd')).toBe('0s')
    expect(assertTime('500ms', 'd')).toBe('500ms')
    expect(() => assertTime('abc', '时长')).toThrow(/时长 格式非法/)
  })
})

describe('animation-gen / splitDecls', () => {
  it('按分号拆成缩进行', () => {
    expect(splitDecls('opacity:0; transform:translateX(10px)')).toEqual([
      '    opacity:0;',
      '    transform:translateX(10px);',
    ])
  })
})

describe('animation-gen / buildAnimation', () => {
  it('输出 @keyframes 与 animation 简写', () => {
    const out = buildAnimation(base)
    expect(out).toContain('@keyframes fadeIn {')
    expect(out).toContain('from {')
    expect(out).toContain('to {')
    expect(out).toContain('animation: 1s ease 0s infinite normal fadeIn;')
  })

  it('from/to 为空时抛错', () => {
    expect(() => buildAnimation({ ...base, from: '' })).toThrow(/关键帧/)
  })

  it('动画名非法抛错', () => {
    expect(() => buildAnimation({ ...base, name: 'bad name!' })).toThrow(/动画名/)
  })
})

describe('animation-gen / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 @keyframes', () => {
    expect(transform({ text: 'go' }, base)).toContain('@keyframes fadeIn')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
