import { describe, expect, it } from 'vitest'
import { DEFAULT_NAME, normalizeName, transform, uudecode, uuencode } from './utils'

const enc = { direction: 'encode', prefix: 'data.txt' } as const
const dec = { direction: 'decode', prefix: 'data.txt' } as const

describe('uuencode-codec / encode', () => {
  it('经典向量：Cat → #0V%T（3 字节 → 4 字符）', () => {
    expect(uuencode('Cat', 'data.txt')).toBe('begin 644 data.txt\n#0V%T\nend')
  })

  it('经典向量：hello → %:&5L;&\\（末组只写 2 字符）', () => {
    expect(uuencode('hello', 'data.txt')).toBe('begin 644 data.txt\n%:&5L;&\\\nend')
  })

  it('45 字节整行用 M 做长度前缀（1 + 60 字符）', () => {
    const line = uuencode('A'.repeat(45), 'data.txt').split('\n')[1]
    expect(line).toBe('M' + '04%!'.repeat(15))
    expect(line).toHaveLength(61)
  })

  it('46 字节分成两行，末行长度前缀为 !（1 字节）', () => {
    const lines = uuencode('A'.repeat(46), 'data.txt').split('\n')
    expect(lines).toHaveLength(4) // begin / 数据行 / 数据行 / end
    expect(lines[2]).toBe('!00')
  })

  it('数据行只使用 0x20..0x5F 区间内的字符', () => {
    const lines = uuencode('中文 a🚀 b', 'data.txt').split('\n')
    for (const line of lines.slice(1, -1)) {
      for (const char of line) {
        const code = char.charCodeAt(0)
        expect(code >= 0x20 && code <= 0x5f).toBe(true)
      }
    }
  })

  it('文件名取自 prefix，空白会被换成下划线', () => {
    expect(uuencode('Cat', 'my file.bin').split('\n')).toEqual([
      'begin 644 my_file.bin',
      '#0V%T',
      'end',
    ])
    expect(uuencode('Cat', '   ')).toContain('begin 644 ' + DEFAULT_NAME)
    expect(normalizeName('')).toBe(DEFAULT_NAME)
  })
})

describe('uuencode-codec / decode', () => {
  it('缺 begin / end 包裹行时仍能解码', () => {
    expect(uudecode('#0V%T')).toBe('Cat')
  })

  it('带包裹行时解码结果一致', () => {
    expect(uudecode('begin 644 data.txt\n#0V%T\nend')).toBe('Cat')
  })

  it('容忍经典的 backtick 零长度终止行', () => {
    expect(uudecode('begin 644 data.txt\n#0V%T\n`\nend')).toBe('Cat')
  })

  it('中英混排与 emoji 往返不丢字符', () => {
    for (const text of ['工具库 Toolbox', 'a🚀b', 'A'.repeat(46)]) {
      expect(uudecode(uuencode(text, 'data.txt'))).toBe(text)
    }
  })

  it('数据行末尾的空格是有意义的（值为 0），不能被 trim 掉', () => {
    // '\u0000' 只有一个字节且 6 bit 值全为 0，编码后是两个空格
    const encoded = uuencode('\u0000', 'data.txt').split('\n')[1]
    expect(encoded).toBe('!  ')
    expect(uudecode(encoded)).toBe('\u0000')
  })
})

describe('uuencode-codec / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: 'Cat' }, enc)).toBe('begin 644 data.txt\n#0V%T\nend')
    expect(transform({ text: '#0V%T' }, dec)).toBe('Cat')
  })

  it('prefix 选项决定 begin 行的文件名', () => {
    expect(transform({ text: 'Cat' }, { direction: 'encode', prefix: 'cat.txt' })).toContain(
      'begin 644 cat.txt',
    )
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, enc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非法输入抛出可读错误', () => {
    expect(() => transform({ text: '!!!not-uu!!!' }, dec)).toThrow(/解码失败/)
    expect(() => transform({ text: 'M' }, dec)).toThrow(/解码失败/)
  })

  it('解码结果不是合法 UTF-8 时报错而不是产出乱码', () => {
    // '!_P' 声明 1 字节，6 bit 值 63/48 合起来是 0xFF，不是合法 UTF-8
    expect(() => uudecode('!_P')).toThrow()
    expect(() => transform({ text: '!_P' }, dec)).toThrow(/解码失败/)
  })
})
