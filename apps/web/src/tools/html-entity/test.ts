import { describe, expect, it } from 'vitest'
import { decodeHtmlEntity, encodeHtmlEntity, transform } from './utils'

const nEnc = { direction: 'encode', mode: 'named' } as const
const numEnc = { direction: 'encode', mode: 'numeric' } as const
const dec = { direction: 'decode', mode: 'named' } as const

describe('html-entity / encode', () => {
  it('五个必须转义的字符用命名实体', () => {
    expect(encodeHtmlEntity('<a & b>', 'named')).toBe('&lt;a &amp; b&gt;')
    expect(encodeHtmlEntity('"x"', 'named')).toBe('&quot;x&quot;')
  })

  it('表内的特殊符号用命名实体', () => {
    expect(encodeHtmlEntity('© ® ™', 'named')).toBe('&copy; &reg; &trade;')
  })

  it('表外的非 ASCII 字符回落为数字实体', () => {
    expect(encodeHtmlEntity('工', 'named')).toBe('&#24037;')
  })

  it('numeric 模式一律用数字实体', () => {
    expect(encodeHtmlEntity('<©', 'numeric')).toBe('&#60;&#169;')
  })

  it('普通 ASCII 文本保持原样（不编码成不可读的 &#xx;）', () => {
    expect(encodeHtmlEntity('hello world 123', 'named')).toBe('hello world 123')
  })

  it('emoji（代理对）按码点编码', () => {
    expect(encodeHtmlEntity('🚀', 'named')).toBe('&#128640;')
  })
})

describe('html-entity / decode', () => {
  it('命名实体还原（含 apos）', () => {
    expect(decodeHtmlEntity('&lt;p&gt; &amp; &quot; &apos;')).toBe('<p> & " \'')
  })

  it('十进制数字实体还原', () => {
    expect(decodeHtmlEntity('&#24037;&#20855;')).toBe('工具')
  })

  it('十六进制数字实体还原（大小写 x 均可）', () => {
    expect(decodeHtmlEntity('&#x5DE5;&#X5177;')).toBe('工具')
  })

  it('未识别的实体原样保留', () => {
    expect(decodeHtmlEntity('&foo; &bar')).toBe('&foo; &bar')
  })

  it('缺少分号的裸 & 不处理', () => {
    expect(decodeHtmlEntity('a & b')).toBe('a & b')
  })
})

describe('html-entity / transform', () => {
  it('编码后可原样解回', () => {
    for (const text of ['<a href="x">工具库</a> & ©', 'a🚀b', 'plain text']) {
      expect(transform({ text: encodeHtmlEntity(text, 'named') }, dec)).toBe(text)
    }
  })

  it('按选项方向与模式执行', () => {
    expect(transform({ text: '<' }, nEnc)).toBe('&lt;')
    expect(transform({ text: '<' }, numEnc)).toBe('&#60;')
    expect(transform({ text: '&lt;' }, dec)).toBe('<')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, nEnc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })
})
