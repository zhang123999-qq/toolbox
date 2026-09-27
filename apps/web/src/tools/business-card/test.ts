import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  BusinessCardError,
  buildBusinessCardData,
  escapeXml,
  localizeError,
  renderBusinessCardSvg,
  transform,
} from './utils'
import type { BusinessCardData } from './utils'
import type { BusinessCardInput } from './schema'

const zh = createTranslator('zh')
const en = createTranslator('en')

/** 断言抛出指定 key 的 BusinessCardError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(BusinessCardError)
    expect((error as BusinessCardError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const full: BusinessCardInput = {
  text: '陈静',
  title: '高级前端工程师',
  company: '星辰科技有限公司',
  phone: '138-0000-1234',
  email: 'chenjing@example.com',
  website: 'www.example.com',
}

const emptyInput: BusinessCardInput = {
  text: '',
  title: '',
  company: '',
  phone: '',
  email: '',
  website: '',
}

describe('business-card / escapeXml', () => {
  it('转义全部 5 种 XML 特殊字符', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })

  it('& 必须先转义（避免双重转义）', () => {
    expect(escapeXml('&lt;')).toBe('&amp;lt;')
  })

  it('纯文本原样返回', () => {
    expect(escapeXml('陈静')).toBe('陈静')
  })
})

describe('business-card / buildBusinessCardData', () => {
  it('全空返回 null（空态）', () => {
    expect(buildBusinessCardData(emptyInput, zh)).toBeNull()
  })

  it('空白字符视为全空', () => {
    expect(buildBusinessCardData({ ...emptyInput, text: '   ' }, zh)).toBeNull()
  })

  it('正常组装并裁剪首尾空格', () => {
    const data = buildBusinessCardData({ ...full, text: '  陈静  ' }, zh)
    expect(data).toMatchObject({ name: '陈静', title: '高级前端工程师', phone: '138-0000-1234' })
  })

  it('姓名为空但填了其他字段抛 emptyName', () => {
    expectKey(
      () => buildBusinessCardData({ ...emptyInput, phone: '123' }, zh),
      'businessCard.error.emptyName',
    )
  })

  it('各字段上限逐个校验', () => {
    const over: Array<[keyof BusinessCardInput, number]> = [
      ['text', 41],
      ['title', 61],
      ['company', 81],
      ['phone', 31],
      ['email', 81],
      ['website', 101],
    ]
    for (const [key, len] of over) {
      expectKey(
        () => buildBusinessCardData({ ...full, [key]: 'x'.repeat(len) }, zh),
        'businessCard.error.tooLong',
      )
    }
  })

  it('边界长度恰好通过', () => {
    const data = buildBusinessCardData({ ...emptyInput, text: 'x'.repeat(40) }, zh)
    expect(data?.name).toBe('x'.repeat(40))
  })
})

describe('business-card / renderBusinessCardSvg', () => {
  const hint = '提示'

  it('完整数据输出全部行与卡面结构', () => {
    const data = buildBusinessCardData(full, zh)
    if (!data) throw new Error('数据不应为 null')
    const svg = renderBusinessCardSvg(data, hint)
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox="0 0 340 200"')
    expect(svg).toContain('linearGradient')
    expect(svg).toContain('陈静')
    expect(svg).toContain('高级前端工程师')
    expect(svg).toContain('星辰科技有限公司')
    expect(svg).toContain('138-0000-1234')
    expect(svg).toContain('chenjing@example.com')
    expect(svg).toContain('www.example.com')
    expect(svg).toContain('<!-- 提示 -->')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('仅姓名时跳过空字段行', () => {
    const data = buildBusinessCardData({ ...emptyInput, text: '陈静' }, zh)
    if (!data) throw new Error('数据不应为 null')
    const svg = renderBusinessCardSvg(data, hint)
    expect(svg).toContain('陈静')
    expect(svg).not.toContain('font-size="13"')
    expect(svg).not.toContain('font-size="12"')
    expect(svg).not.toContain('font-size="11"')
  })

  it('特殊字符被转义', () => {
    const data: BusinessCardData = {
      name: '<陈&静>',
      title: '"工程师"',
      company: "O'Reilly",
      phone: '',
      email: '',
      website: '',
    }
    const svg = renderBusinessCardSvg(data, hint)
    expect(svg).toContain('&lt;陈&amp;静&gt;')
    expect(svg).toContain('&quot;工程师&quot;')
    expect(svg).toContain('O&apos;Reilly')
    expect(svg).not.toContain('<陈&静>')
  })

  it('提示中的特殊字符也被转义', () => {
    const data: BusinessCardData = {
      name: '陈静',
      title: '',
      company: '',
      phone: '',
      email: '',
      website: '',
    }
    const svg = renderBusinessCardSvg(data, 'a<b')
    expect(svg).toContain('<!-- a&lt;b -->')
  })
})

describe('business-card / transform', () => {
  it('空输入返回空字符串', () => {
    expect(transform(emptyInput, zh)).toBe('')
  })

  it('合法输入返回 SVG 代码', () => {
    const svg = transform(full, zh)
    expect(svg).toContain('<svg')
    expect(svg).toContain('陈静')
  })

  it('非法输入抛出已本地化的 Error', () => {
    expect(() => transform({ ...emptyInput, phone: '123' }, zh)).toThrowError('请填写姓名')
    expect(() => transform({ ...emptyInput, phone: '123' }, en)).toThrowError('Please enter a name')
    expect(() => transform({ ...full, text: 'x'.repeat(41) }, zh)).toThrowError(/姓名/)
  })
})

describe('business-card / localizeError', () => {
  it('BusinessCardError 走 i18n（中英）', () => {
    expect(localizeError(new BusinessCardError('businessCard.error.emptyName'), zh)).toBe(
      '请填写姓名',
    )
    expect(localizeError(new BusinessCardError('businessCard.error.emptyName'), en)).toBe(
      'Please enter a name',
    )
  })

  it('普通 Error 原样展示', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串', () => {
    expect(localizeError(42, zh)).toBe('42')
  })
})
