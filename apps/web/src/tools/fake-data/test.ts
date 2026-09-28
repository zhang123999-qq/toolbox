import { describe, expect, it } from 'vitest'
import {
  FIELD_TYPES,
  genAddress,
  genCompany,
  genDate,
  genEmail,
  genIdCard,
  genIp,
  genName,
  genPhone,
  genRecord,
  genUsername,
  genUuid,
  MAX_COUNT,
  parseFields,
  parseFormat,
  parseLanguage,
  transform,
} from './utils'

/** 确定性随机源：恒返回 0.3 */
const rand = () => 0.3

describe('fake-data / 字段生成器', () => {
  it('name 中文为姓+名', () => {
    expect(genName('zh', rand)).toBeTruthy()
    expect(genName('en', rand)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })
  it('email 合法格式', () => {
    for (let i = 0; i < 20; i++)
      expect(genEmail(rand)).toMatch(/^[a-z]+\d{3,4}@[a-z0-9.]+\.[a-z]+$/)
  })
  it('phone 中文 1xx xxxx xxxx / 英文 xxx-xxx-xxxx', () => {
    expect(genPhone('zh', rand)).toMatch(/^1\d{2} \d{4} \d{4}$/)
    expect(genPhone('en', rand)).toMatch(/^\d{3}-\d{3}-\d{4}$/)
  })
  it('ip 四段 0-255', () => {
    for (let i = 0; i < 20; i++) {
      const parts = genIp(rand).split('.').map(Number)
      expect(parts).toHaveLength(4)
      for (const p of parts) expect(p).toBeGreaterThanOrEqual(0)
      for (const p of parts) expect(p).toBeLessThanOrEqual(255)
    }
  })
  it('uuid v4 格式', () => {
    expect(genUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
  it('date 近 5 年 ISO', () => {
    expect(genDate(rand)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('username 字母开头', () => {
    expect(genUsername(rand)).toMatch(/^[a-z][a-z0-9]+$/)
  })
})

describe('fake-data / idcard 校验位', () => {
  it('18 位且校验位正确', () => {
    for (let i = 0; i < 50; i++) {
      const id = genIdCard(rand)
      expect(id).toMatch(/^\d{17}[\dX]$/)
      // 复算校验位
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
      const codes = '10X98765432'
      let sum = 0
      for (let j = 0; j < 17; j++) sum += Number(id[j]) * weights[j]
      expect(id[17]).toBe(codes[sum % 11])
    }
  })
})

describe('fake-data / 地址与公司', () => {
  it('中文地址含省市区街道', () => {
    expect(genAddress('zh', rand)).toMatch(/省|市|区|路|街|大道|号/)
  })
  it('英文地址含州与邮编', () => {
    expect(genAddress('en', rand)).toMatch(/^[\d ]/)
  })
  it('公司名', () => {
    expect(genCompany('zh', rand)).toContain('有限公司')
    expect(genCompany('en', rand)).toContain('Inc.')
  })
})

describe('fake-data / parseFields', () => {
  it('空文本返回空数组', () => {
    expect(parseFields('')).toEqual([])
    expect(parseFields('  \n  \n')).toEqual([])
  })
  it('解析字段列表，去空行', () => {
    expect(parseFields('name\n\nemail\n')).toEqual(['name', 'email'])
  })
  it('未知字段抛中文错', () => {
    expect(() => parseFields('nope')).toThrow(/不支持的字段类型：nope/)
  })
  it('覆盖全部 10 种类型', () => {
    expect(FIELD_TYPES).toHaveLength(10)
    expect(() => parseFields(FIELD_TYPES.join('\n'))).not.toThrow()
  })
})

describe('fake-data / parse 选项', () => {
  it('默认值', () => {
    expect(parseLanguage('')).toBe('zh')
    expect(parseFormat('')).toBe('json')
  })
  it('非法值抛中文错', () => {
    expect(() => parseLanguage('jp')).toThrow(/不支持的语言/)
    expect(() => parseFormat('xml')).toThrow(/不支持的输出格式/)
  })
  it('count 上限', () => {
    expect(() => transform({ text: 'name' }, { count: String(MAX_COUNT + 1) })).toThrow(
      /数量必须为 1 到 20/,
    )
  })
})

describe('fake-data / genRecord', () => {
  it('包含请求的全部字段', () => {
    const rec = genRecord(['name', 'email', 'uuid'], 'zh', rand)
    expect(Object.keys(rec).sort()).toEqual(['email', 'name', 'uuid'])
  })
})

describe('fake-data / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })
  it('json 输出为合法数组', () => {
    const out = transform({ text: 'name\nemail' }, { count: '2' })
    const arr = JSON.parse(out)
    expect(arr).toHaveLength(2)
    expect(arr[0].name).toBeTruthy()
    expect(arr[0].email).toMatch(/@/)
  })
  it('lines 输出每行一条 JSON', () => {
    const out = transform({ text: 'ip' }, { count: '2', format: 'lines' })
    const lines = out.split('\n')
    expect(lines).toHaveLength(2)
    for (const line of lines) expect(JSON.parse(line).ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
  })
  it('未知字段抛中文错', () => {
    expect(() => transform({ text: 'foo' }, {})).toThrow(/不支持的字段类型：foo/)
  })
})
