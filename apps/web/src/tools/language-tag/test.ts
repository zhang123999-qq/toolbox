/**
 * language-tag（#721）utils 单测：BCP 47 解析/构建/校验。
 */
import { describe, expect, it } from 'vitest'
import {
  buildLanguageTag,
  describeTag,
  formatTag,
  isValidLanguageTag,
  lookupLanguageName,
  parseLanguageTag,
} from './utils'

describe('parseLanguageTag 基础', () => {
  it('空输入抛中文错', () => {
    expect(() => parseLanguageTag('')).toThrow('请输入语言标签')
    expect(() => parseLanguageTag('   ')).toThrow('请输入语言标签')
  })
  it('简单标签', () => {
    const p = parseLanguageTag('en')
    expect(p).toMatchObject({ language: 'en', tag: 'en', variants: [], extensions: [], privateUse: [] })
    expect(p.script).toBeUndefined()
    expect(p.region).toBeUndefined()
  })
  it('规范化大小写与下划线', () => {
    expect(parseLanguageTag('ZH-hant-tw').tag).toBe('zh-Hant-TW')
    expect(parseLanguageTag('zh_Hant_TW').tag).toBe('zh-Hant-TW')
  })
  it('含空子标签报错', () => {
    expect(() => parseLanguageTag('zh--CN')).toThrow('空子标签')
    expect(() => parseLanguageTag('-en')).toThrow('空子标签')
  })
  it('语言子标签非法', () => {
    expect(() => parseLanguageTag('1a')).toThrow('语言子标签')
    expect(() => parseLanguageTag('a')).toThrow('语言子标签')
    expect(() => parseLanguageTag('abcdefghi')).toThrow('语言子标签')
  })
})

describe('parseLanguageTag 各部件', () => {
  it('文字与地区', () => {
    const p = parseLanguageTag('zh-Hant-TW')
    expect(p.script).toBe('Hant')
    expect(p.region).toBe('TW')
  })
  it('数字地区', () => {
    expect(parseLanguageTag('es-419').region).toBe('419')
  })
  it('无文字无地区', () => {
    const p = parseLanguageTag('en')
    expect(p.script).toBeUndefined()
    expect(p.region).toBeUndefined()
  })
  it('变体（两种形式）', () => {
    expect(parseLanguageTag('sl-rozaj-biske').variants).toEqual(['rozaj', 'biske'])
    expect(parseLanguageTag('de-CH-1901').variants).toEqual(['1901'])
  })
  it('扩展', () => {
    const p = parseLanguageTag('en-US-u-ca-buddhist')
    expect(p.extensions).toEqual([{ singleton: 'u', subtags: ['ca', 'buddhist'] }])
  })
  it('多个扩展', () => {
    const p = parseLanguageTag('en-a-bbb-b-ccc')
    expect(p.extensions).toHaveLength(2)
  })
  it('扩展后无子标签报错', () => {
    expect(() => parseLanguageTag('en-u')).toThrow('扩展')
  })
  it('私用', () => {
    const p = parseLanguageTag('en-x-private')
    expect(p.privateUse).toEqual(['private'])
    expect(p.tag).toBe('en-x-private')
  })
  it('私用无子标签报错', () => {
    expect(() => parseLanguageTag('en-x')).toThrow('私用')
  })
  it('纯私用标签', () => {
    const p = parseLanguageTag('x-custom-tag')
    expect(p.language).toBe('x')
    expect(p.privateUse).toEqual(['custom', 'tag'])
    expect(p.tag).toBe('x-custom-tag')
  })
  it('纯私用标签无后缀报错', () => {
    expect(() => parseLanguageTag('x')).toThrow('私用')
    expect(() => parseLanguageTag('x-ok-!')).toThrow('私用')
  })
  it('非法位置子标签报错', () => {
    expect(() => parseLanguageTag('en-abc')).toThrow('位置非法')
  })
  it('私用后非法子标签报错', () => {
    expect(() => parseLanguageTag('en-x-ok-!')).toThrow('位置非法')
  })
})

describe('buildLanguageTag', () => {
  it('完整构建', () => {
    expect(
      buildLanguageTag({ language: 'zh', script: 'hant', region: 'tw', variants: ['rozaj'], privateUse: ['my'] }),
    ).toBe('zh-Hant-TW-rozaj-x-my')
  })
  it('仅语言', () => {
    expect(buildLanguageTag({ language: 'EN' })).toBe('en')
  })
  it('数字地区', () => {
    expect(buildLanguageTag({ language: 'es', region: '419' })).toBe('es-419')
  })
  it('空数组可选字段视为缺省', () => {
    expect(buildLanguageTag({ language: 'en', variants: [], privateUse: [] })).toBe('en')
  })
  it('非法语言', () => {
    expect(() => buildLanguageTag({ language: 'e1' })).toThrow('语言子标签')
  })
  it('非法文字', () => {
    expect(() => buildLanguageTag({ language: 'en', script: 'Han' })).toThrow('文字子标签')
  })
  it('非法地区', () => {
    expect(() => buildLanguageTag({ language: 'en', region: 'USA' })).toThrow('地区子标签')
  })
  it('非法变体', () => {
    expect(() => buildLanguageTag({ language: 'en', variants: ['ab'] })).toThrow('变体子标签')
  })
  it('非法私用子标签', () => {
    expect(() => buildLanguageTag({ language: 'en', privateUse: ['ok', '!'] })).toThrow('私用子标签')
  })
})

describe('isValidLanguageTag', () => {
  it('合法与非法', () => {
    expect(isValidLanguageTag('zh-Hant-TW')).toBe(true)
    expect(isValidLanguageTag('en-US-u-ca-buddhist')).toBe(true)
    expect(isValidLanguageTag('not a tag!')).toBe(false)
    expect(isValidLanguageTag('')).toBe(false)
  })
})

describe('lookupLanguageName', () => {
  it('语言/文字/地区', () => {
    expect(lookupLanguageName('zh')).toBe('中文')
    expect(lookupLanguageName('Hant')).toBe('繁体')
    expect(lookupLanguageName('TW')).toBe('台湾')
    expect(lookupLanguageName('419')).toBe('拉丁美洲')
  })
  it('按大小写区分部件类型', () => {
    expect(lookupLanguageName('zh')).toBe('中文')
    expect(lookupLanguageName('de')).toBe('德语')
    expect(lookupLanguageName('DE')).toBe('德国')
    expect(lookupLanguageName('Hant')).toBe('繁体')
    expect(lookupLanguageName('419')).toBe('拉丁美洲')
  })
  it('未知与空返回 undefined', () => {
    expect(lookupLanguageName('xx')).toBeUndefined()
    expect(lookupLanguageName('')).toBeUndefined()
    expect(lookupLanguageName('   ')).toBeUndefined()
  })
})

describe('describeTag', () => {
  it('完整描述', () => {
    expect(describeTag('zh-Hant-TW')).toBe('中文（繁体，台湾）')
  })
  it('仅语言', () => {
    expect(describeTag('en')).toBe('英语')
  })
  it('含变体/扩展/私用', () => {
    expect(describeTag('de-DE-1901-u-ca-buddhist-x-my')).toBe(
      '德语（德国，1901，扩展 u：ca-buddhist，私用：my）',
    )
  })
  it('未知代码回退原文', () => {
    expect(describeTag('xx-YY')).toBe('xx（YY）')
    expect(describeTag('en-Xyzx')).toBe('英语（Xyzx）')
  })
})

describe('formatTag', () => {
  it('全部件输出', () => {
    const text = formatTag(parseLanguageTag('zh-Hant-TW-rozaj-u-ca-x-pv'))
    expect(text).toContain('规范化标签：zh-Hant-TW-rozaj-u-ca-x-pv')
    expect(text).toContain('含义：')
    expect(text).toContain('- 语言：zh')
    expect(text).toContain('- 文字：Hant')
    expect(text).toContain('- 地区：TW')
    expect(text).toContain('- 变体：rozaj')
    expect(text).toContain('- 扩展 u：ca')
    expect(text).toContain('- 私用：x-pv')
  })
  it('无可选部件时不输出对应行', () => {
    const text = formatTag(parseLanguageTag('en'))
    expect(text).not.toContain('- 文字：')
    expect(text).not.toContain('- 地区：')
    expect(text).not.toContain('- 变体：')
    expect(text).not.toContain('- 扩展')
    expect(text).not.toContain('- 私用：')
  })
})
