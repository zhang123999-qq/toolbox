import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const GIB = { from: 'GiB', to: 'MB' }

describe('data-storage / 精确换算', () => {
  it('1 GiB = 1073.741824 MB（十进制）', () => {
    expect(transform({ text: '1' }, GIB)).toBe('1 GiB = 1073.741824 MB')
  })

  it('1 KiB = 1024 B（二进制）', () => {
    expect(transform({ text: '1' }, { from: 'KiB', to: 'B' })).toBe('1 KiB = 1024 B')
  })

  it('1 KB = 1000 B（十进制）', () => {
    expect(transform({ text: '1' }, { from: 'KB', to: 'B' })).toBe('1 KB = 1000 B')
  })

  it('8 bit = 1 B', () => {
    expect(transform({ text: '8' }, { from: 'bit', to: 'B' })).toBe('8 bit = 1 B')
  })

  it('1 TB = 1000 GB', () => {
    expect(transform({ text: '1' }, { from: 'TB', to: 'GB' })).toBe('1 TB = 1000 GB')
  })

  it('1 TiB = 1024 GiB', () => {
    expect(transform({ text: '1' }, { from: 'TiB', to: 'GiB' })).toBe('1 TiB = 1024 GiB')
  })

  it('1 MiB = 1.048576 MB', () => {
    expect(transform({ text: '1' }, { from: 'MiB', to: 'MB' })).toBe('1 MiB = 1.048576 MB')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '64' }, { from: 'GB', to: 'GB' })).toBe('64 GB = 64 GB')
  })
})

describe('data-storage / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, GIB)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, GIB)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  2 ' }, { from: 'MB', to: 'KB' })).toBe('2 MB = 2000 KB')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'B', to: 'bit' })).toBe('0 B = 0 bit')
    expect(transform({ text: '-1' }, { from: 'GB', to: 'MB' })).toBe('-1 GB = -1000 MB')
  })
})

describe('data-storage / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, GIB)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'GiB', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'GiB' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, GIB)).toThrow(/200,000/)
  })
})

describe('data-storage / fmt 去噪声', () => {
  it('浮点噪声被清理', () => {
    expect(fmt(1073741824 / 1e6)).toBe('1073.741824')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual([
      'bit',
      'B',
      'KB',
      'MB',
      'GB',
      'TB',
      'KiB',
      'MiB',
      'GiB',
      'TiB',
    ])
  })
})
