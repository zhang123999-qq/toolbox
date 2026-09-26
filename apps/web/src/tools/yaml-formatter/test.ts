import { describe, expect, it } from 'vitest'
import { YamlFormatterError, transform } from './utils'
import type { YamlFormatterInput, YamlFormatterOptions } from './schema'

const baseOptions: YamlFormatterOptions = { mode: 'format', indent: '2', sortKeys: false }

describe('yaml-formatter / transform', () => {
  it('重排缩进并保留注释', () => {
    const input: YamlFormatterInput = {
      text: '# 注释\nname:  工具库\nserver:\n    port: 8080\n',
    }
    expect(transform(input, baseOptions)).toBe(
      ['# 注释', 'name: 工具库', 'server:', '  port: 8080'].join('\n'),
    )
  })

  it('indent=4 时使用四空格缩进', () => {
    const input: YamlFormatterInput = { text: 'a:\n  b: 1' }
    expect(transform(input, { ...baseOptions, indent: '4' })).toBe('a:\n    b: 1')
  })

  it('sortKeys 开启后按键名字典序输出', () => {
    const input: YamlFormatterInput = { text: 'b: 1\na: 2' }
    expect(transform(input, { ...baseOptions, sortKeys: true })).toBe('a: 2\nb: 1')
  })

  it('识别标量类型与流式集合', () => {
    const input: YamlFormatterInput = {
      text: 'n: 0x1f\nf: 1.5\nt: true\nz: ~\nlist: [1, 2]\nmap: {a: 1}',
    }
    expect(transform(input, baseOptions)).toBe(
      ['n: 31', 'f: 1.5', 't: true', 'z: null', 'list:', '  - 1', '  - 2', 'map:', '  a: 1'].join(
        '\n',
      ),
    )
  })

  it('支持块标量 | 与序列项内映射', () => {
    const input: YamlFormatterInput = {
      text: 'desc: |\n  line1\n  line2\nitems:\n  - name: a\n    qty: 2',
    }
    const out = transform(input, baseOptions)
    expect(out).toContain('desc: "line1\\nline2\\n"')
    expect(out).toContain('- name: a')
    expect(out).toContain('  qty: 2')
  })

  it('validate 模式输出校验报告', () => {
    const input: YamlFormatterInput = { text: 'a:\n  b: 1\nlist:\n  - 1' }
    const out = transform(input, { ...baseOptions, mode: 'validate' })
    expect(out).toContain('✓ YAML 合法')
    expect(out).toContain('· 键总数：3')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '   \n\n' }, baseOptions)).toBe('')
  })

  it('只有注释的文档原样保留注释（边界）', () => {
    expect(transform({ text: '# 只有注释\n' }, baseOptions)).toBe('# 只有注释')
  })

  it('Tab 缩进抛出带行列位置的 YamlFormatterError（异常）', () => {
    expect(() => transform({ text: 'a:\n\tb: 1' }, baseOptions)).toThrow(YamlFormatterError)
    expect(() => transform({ text: 'a:\n\tb: 1' }, baseOptions)).toThrow(/第 2 行/)
  })

  it('不支持多文档语法时报错（异常）', () => {
    expect(() => transform({ text: 'a: 1\n---\nb: 2' }, baseOptions)).toThrow(YamlFormatterError)
  })
})
