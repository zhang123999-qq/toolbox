import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  ResumeError,
  buildResumeData,
  exportFileName,
  formatResumeText,
  localizeError,
  toPlainText,
} from './utils'
import type { ResumeInput } from './schema'

const zh = createTranslator('zh')
const en = createTranslator('en')

/** 断言抛出指定 key 的 ResumeError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ResumeError)
    expect((error as ResumeError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const base: ResumeInput = {
  text: '陈静',
  title: '高级前端工程师',
  phone: '138-0000-1234',
  email: 'chenjing@example.com',
  summary: '8 年前端经验。',
  experience: '2021–至今 星辰科技',
  education: '杭州电子科技大学（本科）',
  skills: 'React / TypeScript',
}

const emptyInput: ResumeInput = {
  text: '',
  title: '',
  phone: '',
  email: '',
  summary: '',
  experience: '',
  education: '',
  skills: '',
}

describe('resume / buildResumeData', () => {
  it('全空返回 null（空态，不报错）', () => {
    expect(buildResumeData(emptyInput, zh)).toBeNull()
  })

  it('全空白字符视为全空', () => {
    expect(buildResumeData({ ...emptyInput, text: '   ' }, zh)).toBeNull()
  })

  it('正常组装并去除首尾空白', () => {
    const data = buildResumeData({ ...base, text: '  陈静  ' }, zh)
    expect(data?.name).toBe('陈静')
    expect(data?.title).toBe('高级前端工程师')
  })

  it('填了其他字段但姓名为空抛 emptyName', () => {
    expectKey(
      () => buildResumeData({ ...emptyInput, title: '工程师' }, zh),
      'resume.error.emptyName',
    )
  })

  it('姓名超长抛 tooLong（41 字符）', () => {
    try {
      buildResumeData({ ...base, text: '陈'.repeat(41) }, zh)
      throw new Error('应当抛出')
    } catch (error) {
      expect(error).toBeInstanceOf(ResumeError)
      const err = error as ResumeError
      expect(err.key).toBe('resume.error.tooLong')
      expect(err.params.field).toBe('姓名')
      expect(err.params.max).toBe(40)
    }
  })

  it('姓名恰为 40 字符不抛错', () => {
    const data = buildResumeData({ ...base, text: '陈'.repeat(40) }, zh)
    expect(data?.name).toBe('陈'.repeat(40))
  })

  it('经历超长抛 tooLong（3001 字符）', () => {
    expectKey(
      () => buildResumeData({ ...base, experience: 'x'.repeat(3001) }, zh),
      'resume.error.tooLong',
    )
  })

  it('各字段上限逐个校验', () => {
    const over: Array<[keyof ResumeInput, number]> = [
      ['title', 61],
      ['phone', 31],
      ['email', 81],
      ['summary', 501],
      ['education', 1001],
      ['skills', 501],
    ]
    for (const [key, len] of over) {
      expectKey(
        () => buildResumeData({ ...base, [key]: 'x'.repeat(len) }, zh),
        'resume.error.tooLong',
      )
    }
  })
})

describe('resume / formatResumeText', () => {
  it('完整数据输出全部段落', () => {
    const data = buildResumeData(base, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatResumeText(data, zh)
    expect(text).toContain('陈静 · 高级前端工程师')
    expect(text).toContain('联系方式：138-0000-1234 / chenjing@example.com')
    expect(text).toContain('个人简介：')
    expect(text).toContain('工作经历：')
    expect(text).toContain('教育背景：')
    expect(text).toContain('技能：')
  })

  it('仅姓名时无联系方式行与段落', () => {
    const data = buildResumeData({ ...emptyInput, text: '陈静' }, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatResumeText(data, zh)
    expect(text).toBe('陈静')
    expect(text).not.toContain('联系方式')
  })

  it('无职位时标题行仅姓名', () => {
    const data = buildResumeData({ ...emptyInput, text: '陈静', phone: '138' }, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatResumeText(data, zh)
    expect(text).toContain('陈静\n联系方式：138')
  })

  it('英文输出使用英文标签', () => {
    const data = buildResumeData(base, en)
    if (!data) throw new Error('数据不应为 null')
    const text = formatResumeText(data, en)
    expect(text).toContain('Contact：')
    expect(text).toContain('Summary：')
  })
})

describe('resume / toPlainText', () => {
  it('空输入返回空字符串', () => {
    expect(toPlainText(emptyInput, zh)).toBe('')
  })

  it('合法输入返回纯文本', () => {
    expect(toPlainText(base, zh)).toContain('陈静')
  })

  it('非法输入返回空字符串（不抛错，供复制/下载安全调用）', () => {
    expect(toPlainText({ ...base, text: '陈'.repeat(41) }, zh)).toBe('')
    expect(toPlainText({ ...emptyInput, title: 'x' }, zh)).toBe('')
  })
})

describe('resume / exportFileName', () => {
  it('常规姓名生成文件名', () => {
    const data = buildResumeData(base, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('resume-陈静.png')
  })

  it('过滤文件名非法字符', () => {
    const data = buildResumeData({ ...base, text: '陈/静:简*历?' }, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('resume-陈静简历.png')
  })

  it('姓名全由非法字符组成时用 untitled 兜底', () => {
    const data = buildResumeData({ ...base, text: '///' }, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('resume-untitled.png')
  })
})

describe('resume / localizeError', () => {
  it('ResumeError 走 i18n（中文）', () => {
    expect(localizeError(new ResumeError('resume.error.emptyName'), zh)).toBe('请填写姓名')
  })

  it('ResumeError 走 i18n（英文）', () => {
    expect(localizeError(new ResumeError('resume.error.emptyName'), en)).toBe('Please enter a name')
  })

  it('tooLong 错误带双语字段名参数', () => {
    const message = localizeError(
      new ResumeError('resume.error.tooLong', { field: '姓名', max: 40 }),
      zh,
    )
    expect(message).toBe('姓名超过 40 字符上限')
  })

  it('普通 Error 原样展示 message', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串展示', () => {
    expect(localizeError('oops', zh)).toBe('oops')
    expect(localizeError(42, zh)).toBe('42')
  })
})
