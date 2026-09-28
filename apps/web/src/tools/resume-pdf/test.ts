import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import type { ResumeInput } from './schema'
import {
  CJK_ERROR,
  assertLatin1,
  buildPdf,
  buildResumeData,
  buildResumeLines,
  parseExperience,
  renderDocLines,
  toPlainText,
  wrapLine,
} from './utils'
import type { DocLine, ResumeData } from './utils'

const BASE_INPUT: ResumeInput = {
  text: '',
  name: 'Jane Doe',
  title: 'Frontend Engineer',
  email: 'jane@example.com',
  phone: '+1 555-0100',
  location: 'Austin, TX',
  summary: '5 years of frontend experience.\nFocused on performance.',
  experience:
    'Acme Studio | Senior Engineer | 2022 - Present | Led web perf initiative\nBeta Inc | Engineer | 2020 - 2022 |',
  education: 'B.S. Computer Science, UT Austin',
  skills: 'TypeScript, React, Node.js',
}

async function helvFont(): Promise<PDFFont> {
  const doc = await PDFDocument.create()
  return doc.embedFont(StandardFonts.Helvetica)
}

function line(partial: Partial<DocLine>): DocLine {
  return {
    text: 'x',
    size: 12,
    bold: false,
    mono: false,
    indent: 0,
    spaceAfter: 6,
    rule: false,
    align: 'left',
    ...partial,
  }
}

function pdfHeader(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes.slice(0, 4))
}

describe('resume-pdf / 基础函数', () => {
  it('中文被拒绝', () => {
    expect(() => assertLatin1('中文')).toThrow(CJK_ERROR)
  })

  it('wrapLine 基本行为', async () => {
    const font = await helvFont()
    expect(wrapLine('', font, 12, 400)).toEqual([''])
    expect(wrapLine('a b', font, 12, 400)).toEqual(['a b'])
    expect(wrapLine('a b', font, 12, 5)).toEqual(['a', 'b'])
  })
})

describe('resume-pdf / 经历解析', () => {
  it('合法经历解析正确', () => {
    const items = parseExperience('Acme | Engineer | 2020 - 2022 | Did things')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      company: 'Acme',
      role: 'Engineer',
      period: '2020 - 2022',
      detail: 'Did things',
    })
  })

  it('描述可空（三列）', () => {
    const items = parseExperience('Acme | Engineer | 2020 - 2022')
    expect(items[0]?.detail).toBe('')
  })

  it('空行被跳过', () => {
    expect(parseExperience('\nAcme | Engineer | 2020 - 2022\n\n')).toHaveLength(1)
  })

  it('列数非法时报错并带行号', () => {
    expect(() => parseExperience('Acme | Engineer')).toThrow('第 1 行格式错误')
    expect(() => parseExperience('a|b|c|d|e')).toThrow('第 1 行格式错误')
  })

  it('公司/职位/时间段为空报错', () => {
    expect(() => parseExperience(' | Engineer | 2020')).toThrow(
      '第 1 行公司、职位、时间段均不能为空',
    )
    expect(() => parseExperience('Acme |  | 2020')).toThrow('第 1 行公司、职位、时间段均不能为空')
    expect(() => parseExperience('Acme | Engineer | ')).toThrow(
      '第 1 行公司、职位、时间段均不能为空',
    )
  })

  it('空经历返回空数组', () => {
    expect(parseExperience('   \n')).toEqual([])
  })
})

describe('resume-pdf / 数据组装', () => {
  it('完整数据组装正确', () => {
    const data = buildResumeData(BASE_INPUT)
    expect(data.name).toBe('Jane Doe')
    expect(data.experience).toHaveLength(2)
    expect(data.experience[1]?.detail).toBe('')
  })

  it('姓名必填', () => {
    expect(() => buildResumeData({ ...BASE_INPUT, name: '  ' })).toThrow('请填写姓名')
  })

  it('字段含中文报错', () => {
    expect(() => buildResumeData({ ...BASE_INPUT, name: '张三' })).toThrow(CJK_ERROR)
  })

  it('可选字段可空', () => {
    const data = buildResumeData({
      ...BASE_INPUT,
      title: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      experience: '',
      education: '',
      skills: '',
    })
    expect(data.experience).toEqual([])
  })
})

describe('resume-pdf / 版式', () => {
  function data(): ResumeData {
    return buildResumeData(BASE_INPUT)
  }

  it('完整字段版式', () => {
    const lines = buildResumeLines(data())
    expect(lines[0]).toMatchObject({ text: 'Jane Doe', size: 24, align: 'center', bold: true })
    expect(lines[1]).toMatchObject({ text: 'Frontend Engineer', align: 'center' })
    expect(lines.some((l) => l.text.includes('jane@example.com'))).toBe(true)
    for (const section of ['Summary', 'Experience', 'Education', 'Skills']) {
      expect(lines.some((l) => l.text === section && l.bold)).toBe(true)
    }
    expect(lines.some((l) => l.text.includes('Senior Engineer @ Acme Studio'))).toBe(true)
    expect(lines.some((l) => l.text.startsWith('- Led web perf'))).toBe(true)
  })

  it('可选字段缺失时章节省略', () => {
    const lines = buildResumeLines(
      buildResumeData({
        ...BASE_INPUT,
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        experience: '',
        education: '',
        skills: '',
      }),
    )
    expect(lines).toHaveLength(1) // 只有姓名一行
    expect(lines[0]?.text).toBe('Jane Doe')
  })

  it('简介中的空行被跳过', () => {
    const lines = buildResumeLines(buildResumeData({ ...BASE_INPUT, summary: 'a\n\nb' }))
    const summaryIdx = lines.findIndex((l) => l.text === 'Summary')
    expect(lines.slice(summaryIdx + 2, summaryIdx + 4).map((l) => l.text)).toEqual(['a', 'b'])
  })

  it('纯文本版包含关键行', () => {
    const text = toPlainText(data())
    expect(text).toContain('Jane Doe')
    expect(text).toContain('Senior Engineer @ Acme Studio (2022 - Present)')
    expect(text).toContain('- Led web perf initiative')
    expect(text).toContain('Education')
    expect(text).toContain('Skills')
  })

  it('纯文本版可选字段缺失时省略', () => {
    const text = toPlainText(
      buildResumeData({
        ...BASE_INPUT,
        title: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        experience: '',
        education: '',
        skills: '',
      }),
    )
    expect(text).toBe('Jane Doe')
  })
})

describe('resume-pdf / 渲染', () => {
  it('四种字体组合', async () => {
    const result = await renderDocLines(
      [
        line({ mono: false, bold: false }),
        line({ mono: false, bold: true }),
        line({ mono: true, bold: false }),
        line({ mono: true, bold: true }),
      ],
      54,
    )
    expect(result.pages).toBe(1)
  })

  it('分割线页首不分页、页尾分页', async () => {
    expect((await renderDocLines([line({ rule: true })], 54)).pages).toBe(1)
    const paras = Array.from({ length: 33 }, (_, i) => line({ text: `p${i}` }))
    expect((await renderDocLines([...paras, line({ rule: true })], 54)).pages).toBe(2)
  })

  it('超长内容自动分页', async () => {
    const paras = Array.from({ length: 40 }, (_, i) => line({ text: `p${i}` }))
    expect((await renderDocLines(paras, 54)).pages).toBe(2)
  })

  it('居中与左对齐', async () => {
    const result = await renderDocLines([line({ align: 'center' }), line({ align: 'left' })], 54)
    expect(result.pages).toBe(1)
  })

  it('渲染时中文报错', async () => {
    await expect(renderDocLines([line({ text: '中文' })], 54)).rejects.toThrow(CJK_ERROR)
  })
})

describe('resume-pdf / buildPdf', () => {
  it('合法输入生成 PDF', async () => {
    const result = await buildPdf(BASE_INPUT)
    expect(pdfHeader(result.bytes)).toBe('%PDF')
    expect(result.pages).toBe(1)
  })

  it('姓名为空 / 中文分别报错', async () => {
    await expect(buildPdf({ ...BASE_INPUT, name: '' })).rejects.toThrow('请填写姓名')
    await expect(buildPdf({ ...BASE_INPUT, name: '张三' })).rejects.toThrow(CJK_ERROR)
  })
})
