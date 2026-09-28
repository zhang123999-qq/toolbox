import { describe, expect, it } from 'vitest'
import {
  buildCss,
  parseDuration,
  parseTiming,
  PRESETS,
  resolvePresetName,
  transform,
} from './utils'

describe('css-gen / resolvePresetName', () => {
  it('空串返回空', () => {
    expect(resolvePresetName('')).toBe('')
  })
  it('命中预设（大小写不敏感）', () => {
    expect(resolvePresetName('Bounce')).toBe('bounce')
    expect(resolvePresetName('fadeIn')).toBe('fadeIn')
    expect(resolvePresetName('slideinleft')).toBe('slideInLeft')
  })
  it('未知预设抛错并列出可用列表', () => {
    expect(() => resolvePresetName('spin')).toThrow(/未知动画预设/)
    expect(() => resolvePresetName('spin')).toThrow(/bounce/)
  })
})

describe('css-gen / parseDuration & parseTiming', () => {
  it('默认值与合法值', () => {
    expect(parseDuration('')).toBe('1s')
    expect(parseDuration('500ms')).toBe('500ms')
    expect(parseTiming('')).toBe('ease')
    expect(parseTiming('linear')).toBe('linear')
  })
  it('非法值抛错', () => {
    expect(() => parseDuration('1')).toThrow(/时长格式非法/)
    expect(() => parseDuration('abc')).toThrow(/时长格式非法/)
    expect(() => parseTiming('bounce')).toThrow(/缓动函数非法/)
  })
})

describe('css-gen / buildCss', () => {
  it('输出 @keyframes 与 animation', () => {
    const out = buildCss('bounce', '1s', 'ease', false)
    expect(out).toContain('@keyframes bounce {')
    expect(out).toContain('animation: bounce 1s ease;')
    expect(out).toContain('translateY(-20px)')
  })
  it('infinite 追加关键字', () => {
    expect(buildCss('pulse', '2s', 'ease-in', true)).toContain(
      'animation: pulse 2s ease-in infinite;',
    )
  })
  it('所有预设都能生成', () => {
    for (const name of Object.keys(PRESETS)) {
      const out = buildCss(name, '1s', 'ease', false)
      expect(out).toContain(`@keyframes ${name} {`)
      expect(out).toContain('.animation {')
    }
  })
})

describe('css-gen / transform', () => {
  it('用 preset 选项生成', () => {
    const out = transform(
      { text: '' },
      { preset: 'fadeIn', duration: '', timing: '', infinite: false },
    )
    expect(out).toContain('@keyframes fadeIn {')
    expect(out).toContain('opacity: 0;')
    expect(out).toContain('animation: fadeIn 1s ease;')
  })
  it('text 命中预设覆盖选项', () => {
    const out = transform(
      { text: 'shake' },
      { preset: 'bounce', duration: '', timing: '', infinite: false },
    )
    expect(out).toContain('@keyframes shake {')
  })
  it('未知 text 抛错', () => {
    expect(() =>
      transform(
        { text: 'wiggle' },
        { preset: 'bounce', duration: '', timing: '', infinite: false },
      ),
    ).toThrow(/未知动画预设/)
  })
  it('非法时长抛错', () => {
    expect(() =>
      transform({ text: '' }, { preset: 'bounce', duration: 'abc', timing: '', infinite: false }),
    ).toThrow(/时长格式非法/)
  })
})
