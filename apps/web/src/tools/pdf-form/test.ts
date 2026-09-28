import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  applyFieldValue,
  assertFileSizeOk,
  buildOutputFileName,
  defaultFieldValue,
  describeField,
  describeForm,
  detectFieldKind,
  errorMessage,
  fillForm,
  isEncryptedPdfError,
  isPdfFile,
  loadPdf,
  truncateText,
  type FieldDescriptor,
} from './utils'

/** 构造一个包含 4 种字段的最小表单 PDF（真实 pdf-lib，无 DOM） */
async function buildFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage()
  const form = doc.getForm()
  const text = form.createTextField('fullName')
  text.setMaxLength(8)
  text.addToPage(page, { x: 50, y: 700, width: 200, height: 24 })
  const multi = form.createTextField('bio')
  multi.enableMultiline()
  multi.addToPage(page, { x: 50, y: 640, width: 200, height: 48 })
  const box = form.createCheckBox('agree')
  box.addToPage(page, { x: 50, y: 600, width: 16, height: 16 })
  const radio = form.createRadioGroup('gender')
  radio.addOptionToPage('male', page, { x: 50, y: 560, width: 16, height: 16 })
  radio.addOptionToPage('female', page, { x: 90, y: 560, width: 16, height: 16 })
  const dropdown = form.createDropdown('country')
  dropdown.addOptions(['CN', 'US'])
  dropdown.addToPage(page, { x: 50, y: 500, width: 200, height: 24 })
  const multiDropdown = form.createDropdown('langs')
  multiDropdown.addOptions(['zh', 'en'])
  multiDropdown.enableMultiselect()
  multiDropdown.addToPage(page, { x: 50, y: 440, width: 200, height: 24 })
  const ro = form.createTextField('code')
  ro.enableReadOnly()
  ro.addToPage(page, { x: 50, y: 400, width: 200, height: 24 })
  return doc.save()
}

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])

/** 构造一个 constructor 名为 name 的假字段 */
function fakeField(name: string, extra: Record<string, unknown> = {}) {
  const cls = { [name]: class {} }[name]
  const inst = new cls()
  return Object.assign(inst, {
    getName: () => 'f1',
    isReadOnly: () => false,
    ...extra,
  })
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(PDF_MAGIC)).toBe(true)
  })

  it('非 PDF / 过短不通过', () => {
    expect(isPdfFile(new Uint8Array([1, 2, 3]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x21]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('isEncryptedPdfError', () => {
  it('识别加密错误文案', () => {
    expect(
      isEncryptedPdfError(new Error('Input document to `PDFDocument.load` is encrypted')),
    ).toBe(true)
  })

  it('非加密错误 / 非 Error 返回 false', () => {
    expect(isEncryptedPdfError(new Error('broken file'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('detectFieldKind', () => {
  it('按 constructor 名识别四种字段', () => {
    expect(detectFieldKind(fakeField('PDFTextField'))).toBe('text')
    expect(detectFieldKind(fakeField('PDFCheckBox'))).toBe('checkbox')
    expect(detectFieldKind(fakeField('PDFRadioGroup'))).toBe('radio')
    expect(detectFieldKind(fakeField('PDFDropdown'))).toBe('dropdown')
  })

  it('未知类型与拿不到名字时返回 unsupported', () => {
    expect(detectFieldKind(fakeField('PDFButton'))).toBe('unsupported')
    expect(detectFieldKind({})).toBe('unsupported')
    expect(detectFieldKind(null)).toBe('unsupported')
    expect(detectFieldKind(undefined)).toBe('unsupported')
    expect(detectFieldKind({ constructor: {} })).toBe('unsupported')
    expect(detectFieldKind({ constructor: { name: 42 } })).toBe('unsupported')
  })
})

describe('describeField / describeForm', () => {
  it('真实表单 PDF：四种字段全部识别，属性正确', async () => {
    const bytes = await buildFormPdf()
    const doc = await loadPdf(bytes)
    const fields = describeForm(doc)
    expect(fields).toHaveLength(7)

    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    expect(byName.fullName.kind).toBe('text')
    expect(byName.fullName.maxLength).toBe(8)
    expect(byName.fullName.multiline).toBe(false)
    expect(byName.bio.multiline).toBe(true)
    expect(byName.bio.maxLength).toBeUndefined()
    expect(byName.agree.kind).toBe('checkbox')
    expect(byName.gender.kind).toBe('radio')
    expect(byName.gender.options).toEqual(['male', 'female'])
    expect(byName.country.kind).toBe('dropdown')
    expect(byName.country.options).toEqual(['CN', 'US'])
    expect(byName.country.multiSelect).toBe(false)
    expect(byName.langs.multiSelect).toBe(true)
    expect(byName.code.readOnly).toBe(true)
    // index 与 getFields() 顺序一致
    expect(fields.map((f) => f.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('无表单的 PDF 返回空数组', async () => {
    const doc = await PDFDocument.create()
    doc.addPage()
    expect(describeForm(doc)).toEqual([])
  })

  it('按钮等未知字段描述为 unsupported', () => {
    const d = describeField(fakeField('PDFButton') as never, 3)
    expect(d.kind).toBe('unsupported')
    expect(d.index).toBe(3)
  })

  it('无名字段保留空名（界面用索引兜底）', () => {
    const d = describeField(
      fakeField('PDFTextField', {
        getName: () => '',
        getMaxLength: () => undefined,
        isMultiline: () => false,
      }) as never,
      0,
    )
    expect(d.name).toBe('')
    expect(d.kind).toBe('text')
  })
})

describe('truncateText', () => {
  it('不限长 / 未超限原样返回', () => {
    expect(truncateText('abc', undefined)).toEqual({ value: 'abc', truncated: false })
    expect(truncateText('abc', 3)).toEqual({ value: 'abc', truncated: false })
    expect(truncateText('abc', -1)).toEqual({ value: 'abc', truncated: false })
  })

  it('超长截断并标记', () => {
    expect(truncateText('abcdef', 3)).toEqual({ value: 'abc', truncated: true })
    expect(truncateText('张三李四', 2)).toEqual({ value: '张三', truncated: true })
  })
})

describe('defaultFieldValue', () => {
  const base: FieldDescriptor = {
    index: 0,
    name: 'f',
    kind: 'text',
    readOnly: false,
    maxLength: undefined,
    multiline: false,
    options: [],
    multiSelect: false,
  }
  it('各类型默认值', () => {
    expect(defaultFieldValue(base)).toBe('')
    expect(defaultFieldValue({ ...base, kind: 'radio' })).toBe('')
    expect(defaultFieldValue({ ...base, kind: 'unsupported' })).toBe('')
    expect(defaultFieldValue({ ...base, kind: 'checkbox' })).toBe(false)
    expect(defaultFieldValue({ ...base, kind: 'dropdown' })).toBe('')
    expect(defaultFieldValue({ ...base, kind: 'dropdown', multiSelect: true })).toEqual([])
  })
})

describe('applyFieldValue', () => {
  const textDesc: FieldDescriptor = {
    index: 0,
    name: 't',
    kind: 'text',
    readOnly: false,
    maxLength: 3,
    multiline: false,
    options: [],
    multiSelect: false,
  }

  it('文本框：写入并按 maxLength 截断；非字符串值视为空', () => {
    const calls: string[] = []
    const field = { setText: (s: string) => calls.push(s) }
    applyFieldValue(field, textDesc, 'abcdef')
    expect(calls).toEqual(['abc'])
    applyFieldValue(field, textDesc, true)
    expect(calls).toEqual(['abc', ''])
  })

  it('复选框：true 勾选，其余取消', () => {
    let checked = false
    const field = {
      check: () => (checked = true),
      uncheck: () => (checked = false),
    }
    const desc = { ...textDesc, kind: 'checkbox' as const }
    applyFieldValue(field, desc, true)
    expect(checked).toBe(true)
    applyFieldValue(field, desc, false)
    expect(checked).toBe(false)
  })

  it('单选组：合法选中；空/非法/非字符串则清空', () => {
    const calls: string[] = []
    const field = {
      select: (o: string) => calls.push(`select:${o}`),
      clear: () => calls.push('clear'),
    }
    const desc = { ...textDesc, kind: 'radio' as const, options: ['a', 'b'] }
    applyFieldValue(field, desc, 'a')
    applyFieldValue(field, desc, '')
    applyFieldValue(field, desc, 'nope')
    applyFieldValue(field, desc, false)
    expect(calls).toEqual(['select:a', 'clear', 'clear', 'clear'])
  })

  it('下拉框（单选）：合法选中；非法清空', () => {
    const calls: string[] = []
    const field = {
      select: (o: string | string[]) => calls.push(`select:${JSON.stringify(o)}`),
      clear: () => calls.push('clear'),
    }
    const desc = { ...textDesc, kind: 'dropdown' as const, options: ['CN', 'US'] }
    applyFieldValue(field, desc, 'US')
    applyFieldValue(field, desc, 'XX')
    applyFieldValue(field, desc, '')
    applyFieldValue(field, desc, true)
    expect(calls).toEqual(['select:"US"', 'clear', 'clear', 'clear'])
  })

  it('下拉框（多选）：过滤非法值后整体选中；全非法则清空', () => {
    const calls: string[] = []
    const field = {
      select: (o: string | string[]) => calls.push(`select:${JSON.stringify(o)}`),
      clear: () => calls.push('clear'),
    }
    const desc = {
      ...textDesc,
      kind: 'dropdown' as const,
      options: ['zh', 'en'],
      multiSelect: true,
    }
    applyFieldValue(field, desc, ['zh', 'en'])
    applyFieldValue(field, desc, ['zh', 'xx', '', 1 as unknown as string])
    applyFieldValue(field, desc, ['xx'])
    expect(calls).toEqual(['select:["zh","en"]', 'select:["zh"]', 'clear'])
  })

  it('只读字段直接跳过，不调用任何方法', () => {
    let called = false
    const field = {
      setText: () => (called = true),
      check: () => (called = true),
    }
    applyFieldValue(field, { ...textDesc, readOnly: true }, 'x')
    applyFieldValue(field, { ...textDesc, kind: 'checkbox' as const, readOnly: true }, true)
    expect(called).toBe(false)
  })

  it('unsupported 种类无操作', () => {
    expect(() => applyFieldValue({}, { ...textDesc, kind: 'unsupported' }, 'x')).not.toThrow()
  })
})

describe('fillForm', () => {
  it('填写后值可持久化读取', async () => {
    const bytes = await buildFormPdf()
    const doc = await loadPdf(bytes)
    const fields = describeForm(doc)
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]))
    const out = await fillForm(
      bytes,
      [
        { descriptor: byName.fullName, value: 'hello' },
        { descriptor: byName.agree, value: true },
        { descriptor: byName.gender, value: 'female' },
        { descriptor: byName.country, value: 'CN' },
        { descriptor: byName.langs, value: ['zh', 'en'] },
        // 越界下标的条目被跳过，不抛错
        {
          descriptor: { ...byName.code, index: 99 },
          value: 'x',
        },
      ],
      false,
    )
    const check = await loadPdf(out)
    const form = check.getForm()
    expect(form.getTextField('fullName').getText()).toBe('hello')
    expect(form.getCheckBox('agree').isChecked()).toBe(true)
    expect(form.getRadioGroup('gender').getSelected()).toBe('female')
    expect(form.getDropdown('country').getSelected()).toEqual(['CN'])
    expect(form.getDropdown('langs').getSelected()).toEqual(['zh', 'en'])
    // 未拼合：字段仍在
    expect(form.getFields()).toHaveLength(7)
  })

  it('flatten=true 时字段被拼合', async () => {
    const bytes = await buildFormPdf()
    const out = await fillForm(bytes, [], true)
    const check = await loadPdf(out)
    expect(check.getForm().getFields()).toHaveLength(0)
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -filled 后缀', () => {
    expect(buildOutputFileName('form.pdf')).toBe('form-filled.pdf')
    expect(buildOutputFileName('a.PDF')).toBe('a-filled.pdf')
  })

  it('无扩展名 / 空名兜底', () => {
    expect(buildOutputFileName('noext')).toBe('noext-filled.pdf')
    expect(buildOutputFileName('')).toBe('form-filled.pdf')
    expect(buildOutputFileName('.pdf')).toBe('form-filled.pdf')
  })
})
