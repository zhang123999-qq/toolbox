import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  ReceiptError,
  buildReceiptData,
  exportFileName,
  formatMoney,
  formatReceiptText,
  localizeError,
  parseAmount,
  parseReceiptDate,
  roundMoney,
  toPlainText,
} from './utils'
import type { ReceiptInput, ReceiptOptions } from './schema'

const zh = createTranslator('zh')
const en = createTranslator('en')

/** 断言抛出指定 key 的 ReceiptError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ReceiptError)
    expect((error as ReceiptError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const base: ReceiptInput = {
  text: '2026 年 9 月房屋租金',
  payer: '张三',
  payee: '李四',
  amount: '3500',
  date: '2026-09-27',
  number: 'R-2026-0001',
}
const cash: ReceiptOptions = { method: '现金' }

const emptyInput: ReceiptInput = {
  text: '',
  payer: '',
  payee: '',
  amount: '',
  date: '',
  number: '',
}

describe('receipt / roundMoney & formatMoney', () => {
  it('浮点误差被修正', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })

  it('千分位格式化', () => {
    expect(formatMoney(3500)).toBe('3,500.00')
  })
})

describe('receipt / parseReceiptDate', () => {
  it('合法日期补零', () => {
    expect(parseReceiptDate('2026-9-7')).toBe('2026-09-07')
  })

  it('非法格式/越界抛 invalidDate', () => {
    expectKey(() => parseReceiptDate('not-a-date'), 'receipt.error.invalidDate')
    expectKey(() => parseReceiptDate('2026-13-01'), 'receipt.error.invalidDate')
    expectKey(() => parseReceiptDate('2023-02-29'), 'receipt.error.invalidDate')
    expect(parseReceiptDate('2024-02-29')).toBe('2024-02-29')
  })
})

describe('receipt / parseAmount', () => {
  it('合法金额解析', () => {
    expect(parseAmount('3500')).toBe(3500)
    expect(parseAmount(' 99.5 ')).toBe(99.5)
  })

  it('非数字抛 invalidAmount', () => {
    expectKey(() => parseAmount('abc'), 'error.invalidAmount')
    expectKey(() => parseAmount(''), 'error.invalidAmount')
    expectKey(() => parseAmount('12,000'), 'error.invalidAmount')
  })

  it('无穷大与 0 抛 invalidAmount', () => {
    expectKey(() => parseAmount('9'.repeat(400)), 'error.invalidAmount')
    expectKey(() => parseAmount('0'), 'error.invalidAmount')
  })

  it('负数抛 negativeAmount', () => {
    expectKey(() => parseAmount('-100'), 'error.negativeAmount')
  })
})

describe('receipt / buildReceiptData', () => {
  it('全空返回 null（空态）', () => {
    expect(buildReceiptData(emptyInput, cash, zh)).toBeNull()
  })

  it('正常组装', () => {
    const data = buildReceiptData(base, cash, zh)
    expect(data).toMatchObject({
      payer: '张三',
      payee: '李四',
      amount: 3500,
      date: '2026-09-27',
      number: 'R-2026-0001',
      method: '现金',
    })
  })

  it('金额为空但填了其他字段抛 emptyAmount', () => {
    expectKey(
      () => buildReceiptData({ ...emptyInput, payer: '张三' }, cash, zh),
      'receipt.error.emptyAmount',
    )
  })

  it('金额非法抛 invalidAmount', () => {
    expectKey(() => buildReceiptData({ ...base, amount: 'abc' }, cash, zh), 'error.invalidAmount')
  })

  it('金额为负抛 negativeAmount', () => {
    expectKey(() => buildReceiptData({ ...base, amount: '-50' }, cash, zh), 'error.negativeAmount')
  })

  it('日期非法抛 invalidDate', () => {
    expectKey(
      () => buildReceiptData({ ...base, date: '2026-02-30' }, cash, zh),
      'receipt.error.invalidDate',
    )
  })

  it('日期留空则为空字符串', () => {
    const data = buildReceiptData({ ...base, date: '' }, cash, zh)
    expect(data?.date).toBe('')
  })

  it('金额做分位四舍五入', () => {
    const data = buildReceiptData({ ...base, amount: '0.1' }, cash, zh)
    expect(data?.amount).toBe(0.1)
  })

  it('各字段上限逐个校验', () => {
    const over: Array<[keyof ReceiptInput, number]> = [
      ['text', 501],
      ['payer', 41],
      ['payee', 41],
      ['amount', 21],
      ['date', 21],
      ['number', 41],
    ]
    for (const [key, len] of over) {
      expectKey(
        () => buildReceiptData({ ...base, [key]: 'x'.repeat(len) }, cash, zh),
        'receipt.error.tooLong',
      )
    }
  })
})

describe('receipt / formatReceiptText', () => {
  it('完整数据输出全部行', () => {
    const data = buildReceiptData(base, cash, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatReceiptText(data, zh)
    expect(text).toContain('收据号：R-2026-0001')
    expect(text).toContain('付款人：张三')
    expect(text).toContain('金额：3,500.00')
    expect(text).toContain('支付方式：现金')
    expect(text).toContain('事由：')
  })

  it('仅金额时跳过空字段行', () => {
    const data = buildReceiptData({ ...emptyInput, amount: '100' }, cash, zh)
    if (!data) throw new Error('数据不应为 null')
    const text = formatReceiptText(data, zh)
    expect(text).not.toContain('付款人')
    expect(text).not.toContain('事由')
    expect(text).toContain('金额：100.00')
  })

  it('支付方式为空时跳过该行', () => {
    const data = buildReceiptData({ ...emptyInput, amount: '100' }, { method: '' }, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(formatReceiptText(data, zh)).not.toContain('支付方式')
  })

  it('英文输出使用英文标签', () => {
    const data = buildReceiptData(base, { method: 'Cash' }, en)
    if (!data) throw new Error('数据不应为 null')
    const text = formatReceiptText(data, en)
    expect(text).toContain('Amount：')
    expect(text).toContain('Payment method：Cash')
  })
})

describe('receipt / toPlainText', () => {
  it('空输入返回空字符串', () => {
    expect(toPlainText(emptyInput, cash, zh)).toBe('')
  })

  it('合法输入返回纯文本', () => {
    expect(toPlainText(base, cash, zh)).toContain('3,500.00')
  })

  it('非法输入返回空字符串（不抛错）', () => {
    expect(toPlainText({ ...base, amount: 'abc' }, cash, zh)).toBe('')
    expect(toPlainText({ ...base, amount: '' }, cash, zh)).toBe('')
  })
})

describe('receipt / exportFileName', () => {
  it('用收据号生成文件名', () => {
    const data = buildReceiptData(base, cash, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('receipt-R-2026-0001.png')
  })

  it('无收据号时用 untitled 兜底', () => {
    const data = buildReceiptData({ ...base, number: '' }, cash, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('receipt-untitled.png')
  })

  it('过滤非法字符', () => {
    const data = buildReceiptData({ ...base, number: 'R/001:*' }, cash, zh)
    if (!data) throw new Error('数据不应为 null')
    expect(exportFileName(data)).toBe('receipt-R001.png')
  })
})

describe('receipt / localizeError', () => {
  it('ReceiptError 走 i18n（中英）', () => {
    expect(localizeError(new ReceiptError('receipt.error.emptyAmount'), zh)).toBe('请填写金额')
    expect(localizeError(new ReceiptError('receipt.error.emptyAmount'), en)).toBe(
      'Please enter an amount',
    )
  })

  it('复用的通用错误 key 正确翻译', () => {
    expect(localizeError(new ReceiptError('error.negativeAmount'), zh)).toBe('金额不能为负数')
    expect(localizeError(new ReceiptError('error.negativeAmount'), en)).toBe(
      'Amount cannot be negative',
    )
  })

  it('普通 Error 原样展示', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串', () => {
    expect(localizeError(42, zh)).toBe('42')
  })
})
