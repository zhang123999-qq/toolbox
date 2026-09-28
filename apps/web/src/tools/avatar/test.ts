import { describe, expect, it } from 'vitest'
import type { AvatarOptions } from './schema'
import { buildAvatarSvg, hashText, initialOf, mulberry32, parseSize, parseStyle } from './utils'

const base: AvatarOptions = { size: '128', style: 'initials', bgColor: '' }

describe('avatar / hashText & mulberry32', () => {
  it('相同文本哈希一致，不同文本不同', () => {
    expect(hashText('张三')).toBe(hashText('张三'))
    expect(hashText('张三')).not.toBe(hashText('李四'))
  })

  it('mulberry32 相同种子产出相同序列', () => {
    const a = mulberry32(42)()
    const b = mulberry32(42)()
    expect(a).toBe(b)
  })
})

describe('avatar / initialOf', () => {
  it('中文取首字', () => {
    expect(initialOf('张三')).toBe('张')
  })
  it('英文取首字母大写', () => {
    expect(initialOf('alice')).toBe('A')
    expect(initialOf('Bob')).toBe('B')
  })
})

describe('avatar / parseSize', () => {
  it('空返回默认 128', () => {
    expect(parseSize('')).toBe(128)
  })
  it('边界值 32 / 512 合法', () => {
    expect(parseSize('32')).toBe(32)
    expect(parseSize('512')).toBe(512)
  })
  it('越界或非整数抛中文错', () => {
    expect(() => parseSize('31')).toThrow(/尺寸必须是/)
    expect(() => parseSize('513')).toThrow(/尺寸必须是/)
    expect(() => parseSize('abc')).toThrow(/尺寸必须是/)
  })
})

describe('avatar / parseStyle', () => {
  it('空返回 initials', () => {
    expect(parseStyle('')).toBe('initials')
  })
  it('未知样式抛错', () => {
    expect(() => parseStyle('3d')).toThrow(/未知的头像样式/)
  })
})

describe('avatar / buildAvatarSvg', () => {
  it('输出包含 svg 标签与正确尺寸', () => {
    const svg = buildAvatarSvg({ text: 'Alice' }, { ...base, size: '64' }, 'seed')
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="64"')
    expect(svg).toContain('height="64"')
    expect(svg).toContain('viewBox="0 0 64 64"')
  })

  it('initials 样式包含首字母与渐变', () => {
    const svg = buildAvatarSvg({ text: 'Alice' }, base, 'seed')
    expect(svg).toContain('>A</text>')
    expect(svg).toContain('<linearGradient')
  })

  it('指定背景色时使用该颜色', () => {
    const svg = buildAvatarSvg({ text: 'Bob' }, { ...base, bgColor: '#ff0000' }, 'seed')
    expect(svg).toContain('#ff0000')
  })

  it('geometric 样式包含圆形或多边形', () => {
    const svg = buildAvatarSvg({ text: 'Carol' }, { ...base, style: 'geometric' }, 'seed')
    expect(svg).toMatch(/<circle|<polygon/)
  })

  it('相同文本生成相同结果（确定性）', () => {
    const a = buildAvatarSvg({ text: 'Dave' }, base, 'seed')
    const b = buildAvatarSvg({ text: 'Dave' }, base, 'seed')
    expect(a).toBe(b)
  })

  it('非法尺寸抛错', () => {
    expect(() => buildAvatarSvg({ text: 'Eve' }, { ...base, size: '0' }, 'seed')).toThrow(
      /尺寸必须是/,
    )
  })
})
