import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  PosterError,
  buildPosterData,
  exportFileName,
  formatPosterText,
  localizeError,
  toPlainText,
} from './utils'
import type { PosterInput, PosterOptions } from './schema'

const zh = createTranslator('zh')
const en = createTranslator('en')
const themes = ['橙红', '深蓝', '墨绿', '暗夜']
const themesEn = ['Ember', 'Navy', 'Forest', 'Midnight']

/** 断言抛出指定 key 的 PosterError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(PosterError)
    expect((error as PosterError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const base: PosterInput = {
  text: '秋日特惠，全场八折\n活动时间：10 月 1 日 - 10 月 7 日',
  title: '金秋大促',
  subtitle: '一年一度的购物盛宴',
  footer: '星辰百货 · 敬上',
}
const sunset: PosterOptions = { theme: '橙红' }

const emptyInput: PosterInput = { text: '', title: '', subtitle: '', footer: '' }

describe('poster / buildPosterData', () => {
  it('全空返回 null（空态）', () => {
    expect(buildPosterData(emptyInput, sunset, themes, zh)).toBeNull()
  })

  it('正常组装', () => {
    const data = buildPosterData(base, sunset, themes, zh)
    expect(data).toMatchObject({ title: '金秋大促', theme: '橙红' })
  })

  it('主题不在白名单抛 unknownTheme', () => {
    expectKey(
      () => buildPosterData(base, { theme: '火星' }, themes, zh),
      'poster.error.unknownTheme',
    )
  })

  it('各字段上限逐个校验', () => {
    const over: Array<[keyof PosterInput, number]> = [
      ['text', 2001],
      ['title', 81],
      ['subtitle', 121],
      ['footer', 101],
    ]
    for (const [key, len] of over) {
      expectKey(
        () => buildPosterData({ ...base, [key]: 'x'.repeat(len) }, sunset, themes, zh),
        'poster.error.tooLong',
      )
    }
  })
})

describe('poster / formatPosterText', () => {
  it('完整数据输出全部行', () => {
    const data = buildPosterData(base, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatPosterText(data, zh)
    expect(text).toContain('主题：橙红')
    expect(text).toContain('金秋大促')
    expect(text).toContain('一年一度的购物盛宴')
    expect(text).toContain('秋日特惠，全场八折')
    expect(text).toContain('星辰百货 · 敬上')
  })

  it('仅标题时输出标题行', () => {
    const data = buildPosterData({ ...emptyInput, title: '标题' }, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatPosterText(data, zh)
    expect(text).toContain('标题')
  })

  it('仅副标题时输出副标题行', () => {
    const data = buildPosterData({ ...emptyInput, subtitle: '副标题' }, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(formatPosterText(data, zh)).toContain('副标题')
  })

  it('仅正文时跳过标题分隔行', () => {
    const data = buildPosterData({ ...emptyInput, text: '正文' }, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatPosterText(data, zh)
    expect(text).toContain('正文')
    expect(text).not.toContain('金秋')
  })

  it('英文输出使用英文标签', () => {
    const data = buildPosterData(base, { theme: 'Ember' }, themesEn, en)
    if (!data) throw new Error('数据不应为 null')
    const text = formatPosterText(data, en)
    expect(text).toContain('Theme：Ember')
  })
})

describe('poster / toPlainText', () => {
  it('空输入返回空字符串', () => {
    expect(toPlainText(emptyInput, sunset, themes, zh)).toBe('')
  })

  it('合法输入返回纯文本', () => {
    expect(toPlainText(base, sunset, themes, zh)).toContain('金秋大促')
  })

  it('非法输入返回空字符串（不抛错）', () => {
    expect(toPlainText(base, { theme: '火星' }, themes, zh)).toBe('')
    expect(toPlainText({ ...base, title: 'x'.repeat(81) }, sunset, themes, zh)).toBe('')
  })
})

describe('poster / exportFileName', () => {
  it('用标题生成文件名', () => {
    const data = buildPosterData(base, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('poster-金秋大促.png')
  })

  it('无标题时用 untitled 兜底', () => {
    const data = buildPosterData({ ...emptyInput, text: '正文' }, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('poster-untitled.png')
  })

  it('过滤非法字符', () => {
    const data = buildPosterData({ ...emptyInput, text: 'x', title: 'A/B:*' }, sunset, themes, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('poster-AB.png')
  })
})

describe('poster / localizeError', () => {
  it('PosterError 走 i18n（中英）', () => {
    expect(localizeError(new PosterError('poster.error.unknownTheme', { value: '火星' }), zh)).toBe(
      '未知主题：火星',
    )
    expect(localizeError(new PosterError('poster.error.unknownTheme', { value: 'Mars' }), en)).toBe(
      'Unknown theme: Mars',
    )
  })

  it('普通 Error 原样展示', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串', () => {
    expect(localizeError(42, zh)).toBe('42')
  })
})
