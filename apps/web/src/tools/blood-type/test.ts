import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  ABO_TYPES,
  ALL_BLOOD_TYPES,
  BloodTypeError,
  canDonatePlasma,
  canDonateRbc,
  formatBloodType,
  localizeError,
  parseBloodType,
  PLASMA_COMPATIBILITY,
  plasmaDonorsFor,
  plasmaRecipientsFor,
  RBC_COMPATIBILITY,
  rbcDonorsFor,
  rbcRecipientsFor,
  transform,
} from './utils'
import type { BloodType } from './utils'

const empty = {}
const zh = createTranslator('zh')
const en = createTranslator('en')

const bt = (abo: BloodType['abo'], rh: BloodType['rh']): BloodType => ({ abo, rh })

/** 断言抛出指定 key 的 BloodTypeError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(BloodTypeError)
    expect((error as BloodTypeError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

describe('blood-type / parseBloodType', () => {
  it('解析 8 种标准写法', () => {
    expect(parseBloodType('O-')).toEqual([bt('O', '-')])
    expect(parseBloodType('O+')).toEqual([bt('O', '+')])
    expect(parseBloodType('A+')).toEqual([bt('A', '+')])
    expect(parseBloodType('AB-')).toEqual([bt('AB', '-')])
  })

  it('大小写与空格不敏感', () => {
    expect(parseBloodType('a+')).toEqual([bt('A', '+')])
    expect(parseBloodType('A +')).toEqual([bt('A', '+')])
    expect(parseBloodType(' ab- ')).toEqual([bt('AB', '-')])
  })

  it('省略 Rh 时返回 +/- 两种', () => {
    expect(parseBloodType('AB')).toEqual([bt('AB', '-'), bt('AB', '+')])
    expect(parseBloodType('o')).toEqual([bt('O', '-'), bt('O', '+')])
  })

  it('非法输入抛 invalid', () => {
    for (const s of ['X', 'A++', 'ABO', 'A0', '+-', 'A+-']) {
      expectKey(() => parseBloodType(s), 'bloodType.error.invalid')
    }
  })

  it('空串抛 invalid（transform 层先判空）', () => {
    expectKey(() => parseBloodType('   '), 'bloodType.error.invalid')
  })
})

describe('blood-type / canDonateRbc', () => {
  it('O- 为万能供血者：可输给全部 8 种', () => {
    for (const r of ALL_BLOOD_TYPES) {
      expect(canDonateRbc(bt('O', '-'), r)).toBe(true)
    }
  })

  it('AB+ 为万能受血者：可接受全部 8 种', () => {
    for (const d of ALL_BLOOD_TYPES) {
      expect(canDonateRbc(d, bt('AB', '+'))).toBe(true)
    }
  })

  it('ABO 不相容：B 型不能输给 A 型', () => {
    expect(canDonateRbc(bt('B', '+'), bt('A', '+'))).toBe(false)
    expect(canDonateRbc(bt('A', '+'), bt('B', '+'))).toBe(false)
  })

  it('Rh 不相容：Rh+ 不能输给 Rh-', () => {
    expect(canDonateRbc(bt('A', '+'), bt('A', '-'))).toBe(false)
    expect(canDonateRbc(bt('O', '+'), bt('O', '-'))).toBe(false)
  })

  it('Rh- 可输给 Rh+', () => {
    expect(canDonateRbc(bt('A', '-'), bt('A', '+'))).toBe(true)
  })

  it('同型相容', () => {
    expect(canDonateRbc(bt('AB', '-'), bt('AB', '-'))).toBe(true)
  })
})

describe('blood-type / canDonatePlasma（与红细胞相反）', () => {
  it('AB 型血浆为通用供者', () => {
    for (const r of ALL_BLOOD_TYPES) {
      expect(canDonatePlasma(bt('AB', '+'), r)).toBe(true)
    }
    expect(canDonatePlasma(bt('AB', '-'), bt('O', '-'))).toBe(true)
  })

  it('O 型血浆只能输给 O 型', () => {
    expect(canDonatePlasma(bt('O', '+'), bt('O', '+'))).toBe(true)
    expect(canDonatePlasma(bt('O', '+'), bt('O', '-'))).toBe(true)
    expect(canDonatePlasma(bt('O', '+'), bt('A', '+'))).toBe(false)
    expect(canDonatePlasma(bt('O', '+'), bt('AB', '+'))).toBe(false)
  })

  it('血浆输血不考虑 Rh（Rh 抗原只在红细胞上）', () => {
    expect(canDonatePlasma(bt('A', '+'), bt('A', '-'))).toBe(true)
    expect(canDonatePlasma(bt('A', '-'), bt('A', '+'))).toBe(true)
  })
})

describe('blood-type / 穷举相容表', () => {
  it('红细胞表 64 条，相容 27 对', () => {
    expect(RBC_COMPATIBILITY).toHaveLength(64)
    expect(RBC_COMPATIBILITY.filter((p) => p.compatible)).toHaveLength(27)
  })

  it('血浆表 64 条，相容 36 对（O 型受者 16 对、A/B 型各 8 对、AB 型 4 对）', () => {
    expect(PLASMA_COMPATIBILITY).toHaveLength(64)
    expect(PLASMA_COMPATIBILITY.filter((p) => p.compatible)).toHaveLength(36)
  })

  it('8 种血型齐全且有序', () => {
    expect(ALL_BLOOD_TYPES).toHaveLength(8)
    expect(ALL_BLOOD_TYPES.map(formatBloodType)).toEqual([
      'O-',
      'O+',
      'A-',
      'A+',
      'B-',
      'B+',
      'AB-',
      'AB+',
    ])
    expect(ABO_TYPES).toEqual(['O', 'A', 'B', 'AB'])
  })
})

describe('blood-type / 查询函数', () => {
  it('A+ 可接受的供血者（红细胞）：O-、O+、A-、A+', () => {
    expect(rbcDonorsFor(bt('A', '+')).map(formatBloodType)).toEqual(['O-', 'O+', 'A-', 'A+'])
  })

  it('A+ 可捐献给（红细胞）：A+、AB+', () => {
    expect(rbcRecipientsFor(bt('A', '+')).map(formatBloodType)).toEqual(['A+', 'AB+'])
  })

  it('A+ 可接受的供血者（血浆）：A-、A+、AB-、AB+', () => {
    expect(plasmaDonorsFor(bt('A', '+')).map(formatBloodType)).toEqual(['A-', 'A+', 'AB-', 'AB+'])
  })

  it('A+ 可捐献给（血浆）：O-、O+、A-、A+', () => {
    expect(plasmaRecipientsFor(bt('A', '+')).map(formatBloodType)).toEqual(['O-', 'O+', 'A-', 'A+'])
  })

  it('O- 可捐献给全部 8 种（红细胞）', () => {
    expect(rbcRecipientsFor(bt('O', '-'))).toHaveLength(8)
  })
})

describe('blood-type / formatBloodType', () => {
  it('拼接 ABO + Rh', () => {
    expect(formatBloodType(bt('AB', '+'))).toBe('AB+')
    expect(formatBloodType(bt('O', '-'))).toBe('O-')
  })
})

describe('blood-type / localizeError', () => {
  it('BloodTypeError 走 i18n', () => {
    expect(
      localizeError(new BloodTypeError('bloodType.error.invalid', { value: 'X' }), zh),
    ).toContain('无法识别的血型：X')
    expect(
      localizeError(new BloodTypeError('bloodType.error.invalid', { value: 'X' }), en),
    ).toContain('Unrecognized blood type: X')
  })

  it('普通 Error 原样展示 message', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串', () => {
    expect(localizeError('oops', zh)).toBe('oops')
  })
})

describe('blood-type / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty, zh)).toBe('')
    expect(transform({ text: '   ' }, empty, zh)).toBe('')
  })

  it('A+ 输出红细胞与血浆配对', () => {
    const out = transform({ text: 'A+' }, empty, zh)
    expect(out).toContain('受血者：A+')
    expect(out).toContain('可接受的供血者（红细胞）：O-、O+、A-、A+')
    expect(out).toContain('可捐献给（红细胞）：A+、AB+')
    expect(out).toContain('可接受的供血者（血浆）：A-、A+、AB-、AB+')
    expect(out).toContain('可捐献给（血浆）：O-、O+、A-、A+')
    expect(out).toContain('AB 型血浆为通用供者')
  })

  it('省略 Rh 时输出两种血型', () => {
    const out = transform({ text: 'ab' }, empty, zh)
    expect(out).toContain('受血者：AB-')
    expect(out).toContain('受血者：AB+')
  })

  it('O- 输出可捐献给全部 8 种', () => {
    const out = transform({ text: 'O-' }, empty, zh)
    expect(out).toContain('可捐献给（红细胞）：O-、O+、A-、A+、B-、B+、AB-、AB+')
  })

  it('非法血型抛本地化错误', () => {
    expect(() => transform({ text: 'X' }, empty, zh)).toThrow(/无法识别的血型/)
    expect(() => transform({ text: 'X' }, empty, en)).toThrow(/Unrecognized blood type/)
  })

  it('超长输入抛 tooLong', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, empty, zh)).toThrow(/超过 200,000 字符/)
  })
})
