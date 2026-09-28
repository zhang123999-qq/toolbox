/**
 * options（#781）utils 单测：Options 选项页模板生成。
 */
import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  FIELD_TYPE_VALUES,
  generateOptionsPage,
  parseOptionsInput,
  renderOptionsFiles,
  validateOptionField,
  type OptionField,
} from './utils'

const TEXT_FIELD: OptionField = { key: 'apiHost', label: '接口地址', type: 'text' }

describe('escapeHtml', () => {
  it('转义特殊字符', () => {
    expect(escapeHtml('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
})

describe('validateOptionField', () => {
  it('四种类型合法字段通过', () => {
    expect(() => validateOptionField(TEXT_FIELD)).not.toThrow()
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'checkbox', defaultValue: true })).not.toThrow()
    expect(() =>
      validateOptionField({ key: 'a', label: 'l', type: 'select', options: ['x'], defaultValue: 'x' }),
    ).not.toThrow()
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'number', defaultValue: 3 })).not.toThrow()
    expect(FIELD_TYPE_VALUES).toEqual(['text', 'checkbox', 'select', 'number'])
  })
  it('非对象报错', () => {
    expect(() => validateOptionField(null)).toThrow('字段必须是对象')
    expect(() => validateOptionField([])).toThrow('字段必须是对象')
    expect(() => validateOptionField('x')).toThrow('字段必须是对象')
  })
  it('非法 key 报错', () => {
    expect(() => validateOptionField({ ...TEXT_FIELD, key: 1 })).toThrow('非法字段 key')
    expect(() => validateOptionField({ ...TEXT_FIELD, key: '1abc' })).toThrow('非法字段 key')
    expect(() => validateOptionField({ ...TEXT_FIELD, key: 'a-b' })).toThrow('非法字段 key')
    expect(() => validateOptionField({ ...TEXT_FIELD, key: '' })).toThrow('非法字段 key')
  })
  it('空 label 报错', () => {
    expect(() => validateOptionField({ ...TEXT_FIELD, label: '  ' })).toThrow('label 不能为空')
  })
  it('非法 type 报错', () => {
    expect(() => validateOptionField({ ...TEXT_FIELD, type: 'date' })).toThrow('type 非法')
  })
  it('select 缺少合法 options 报错', () => {
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'select' })).toThrow('需要非空 options 数组')
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'select', options: [] })).toThrow(
      '需要非空 options 数组',
    )
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'select', options: [''] })).toThrow(
      '必须是非空字符串数组',
    )
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'select', options: [1] })).toThrow(
      '必须是非空字符串数组',
    )
  })
  it('defaultValue 类型不符报错', () => {
    expect(() => validateOptionField({ ...TEXT_FIELD, defaultValue: 1 })).toThrow('text 需要字符串')
    expect(() =>
      validateOptionField({ key: 'a', label: 'l', type: 'checkbox', defaultValue: 'yes' }),
    ).toThrow('checkbox 需要布尔值')
    expect(() => validateOptionField({ key: 'a', label: 'l', type: 'number', defaultValue: '1' })).toThrow(
      'number 需要数字',
    )
    expect(() =>
      validateOptionField({ key: 'a', label: 'l', type: 'select', options: ['x'], defaultValue: 'y' }),
    ).toThrow('必须是 options 中的一项')
    expect(() =>
      validateOptionField({ key: 'a', label: 'l', type: 'select', options: ['x'], defaultValue: 1 }),
    ).toThrow('必须是 options 中的一项')
  })
})

describe('generateOptionsPage', () => {
  it('四种字段生成对应 HTML 与读写 JS', () => {
    const files = generateOptionsPage([
      { key: 'host', label: '地址', type: 'text', defaultValue: 'https://a.com' },
      { key: 'notify', label: '通知', type: 'checkbox', defaultValue: true },
      { key: 'theme', label: '主题', type: 'select', options: ['light', 'dark'], defaultValue: 'dark' },
      { key: 'interval', label: '间隔', type: 'number', defaultValue: 30 },
    ])
    expect(files.html).toContain('id="field-host"')
    expect(files.html).toContain('type="checkbox" checked')
    expect(files.html).toContain('<option value="dark" selected>dark</option>')
    expect(files.html).toContain('type="number"')
    expect(files.js).toContain("document.getElementById('field-notify').checked")
    expect(files.js).toContain("Number(document.getElementById('field-interval').value)")
    expect(files.js).toContain('chrome.storage.sync')
    expect(files.js).toContain("'host', 'notify', 'theme', 'interval'")
  })
  it('无默认值时不输出 value/checked/selected', () => {
    const files = generateOptionsPage([{ key: 'host', label: '地址', type: 'text' }])
    expect(files.html).not.toContain('value="')
    const files2 = generateOptionsPage([{ key: 'n', label: '通知', type: 'checkbox' }])
    expect(files2.html).not.toContain('checked')
  })
  it('label 做 HTML 转义', () => {
    const files = generateOptionsPage([{ key: 'a', label: '<script>', type: 'text' }])
    expect(files.html).toContain('&lt;script&gt;')
  })
  it('重复 key 报错', () => {
    expect(() =>
      generateOptionsPage([TEXT_FIELD, { ...TEXT_FIELD, label: '另一个' }]),
    ).toThrow('重复字段 key：apiHost')
  })
  it('非法字段与空数组报错', () => {
    expect(() => generateOptionsPage([])).toThrow('至少需要一个选项字段')
    expect(() => generateOptionsPage('x' as never)).toThrow('至少需要一个选项字段')
    expect(() => generateOptionsPage([{ ...TEXT_FIELD, key: 'bad-key' }])).toThrow('非法字段 key')
  })
  it('renderOptionsFiles 输出两段分隔', () => {
    const out = renderOptionsFiles(generateOptionsPage([TEXT_FIELD]))
    expect(out).toContain('===== options.html =====')
    expect(out).toContain('===== options.js =====')
  })
})

describe('parseOptionsInput', () => {
  it('解析合法输入并复用完整校验', () => {
    const fields = parseOptionsInput(
      '{"fields":[{"key":"a","label":"l","type":"text"},{"key":"b","label":"m","type":"checkbox"}]}',
    )
    expect(fields.length).toBe(2)
  })
  it('重复 key 在解析阶段即报错', () => {
    expect(() =>
      parseOptionsInput('{"fields":[{"key":"a","label":"l","type":"text"},{"key":"a","label":"m","type":"text"}]}'),
    ).toThrow('重复字段 key')
  })
  it('非法输入报错', () => {
    expect(() => parseOptionsInput('')).toThrow('输入不能为空')
    expect(() => parseOptionsInput('{bad')).toThrow('输入不是合法 JSON')
    expect(() => parseOptionsInput('[]')).toThrow('输入必须是 JSON 对象')
    expect(() => parseOptionsInput('{}')).toThrow('输入需要 fields 数组')
    expect(() => parseOptionsInput('{"fields":[]}')).toThrow('至少需要一个选项字段')
  })
})
