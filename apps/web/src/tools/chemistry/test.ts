/**
 * chemistry（#823）utils 单测：化学式解析、配平、摩尔质量。
 */
import { describe, expect, it } from 'vitest'
import { ATOMIC_MASS, balanceEquation, formatCounts, molarMass, parseFormula } from './utils'

describe('parseFormula', () => {
  it('解析 H2O', () => {
    const c = parseFormula('H2O')
    expect(c.get('H')).toBe(2)
    expect(c.get('O')).toBe(1)
  })
  it('解析带括号的 Ca(OH)2', () => {
    const c = parseFormula('Ca(OH)2')
    expect(c.get('Ca')).toBe(1)
    expect(c.get('O')).toBe(2)
    expect(c.get('H')).toBe(2)
  })
  it('解析嵌套括号 Al2(SO4)3', () => {
    const c = parseFormula('Al2(SO4)3')
    expect(c.get('Al')).toBe(2)
    expect(c.get('S')).toBe(3)
    expect(c.get('O')).toBe(12)
  })
  it('忽略空格', () => {
    expect(parseFormula(' H2 O ').get('H')).toBe(2)
  })
  it('空字符串抛中文错误', () => {
    expect(() => parseFormula('')).toThrow('化学式不能为空')
    expect(() => parseFormula('   ')).toThrow('化学式不能为空')
  })
  it('非法字符抛中文错误', () => {
    expect(() => parseFormula('H2O+')).toThrow('无法解析的字符')
  })
  it('右括号多余抛括号不匹配', () => {
    expect(() => parseFormula(')H2O(')).toThrow('括号不匹配')
  })
  it('左括号未闭合抛括号不匹配', () => {
    expect(() => parseFormula('Ca(OH2')).toThrow('括号不匹配')
  })
  it('空括号化学式无效', () => {
    expect(() => parseFormula('()')).toThrow('化学式无效')
  })
})

describe('molarMass', () => {
  it('H2O 约为 18.015', () => {
    expect(molarMass('H2O')).toBeCloseTo(18.015, 3)
  })
  it('NaCl 约为 58.44', () => {
    expect(molarMass('NaCl')).toBeCloseTo(58.44, 2)
  })
  it('Al2(SO4)3 约为 342.132', () => {
    expect(molarMass('Al2(SO4)3')).toBeCloseTo(342.132, 3)
  })
  it('未知元素抛中文错误', () => {
    expect(() => molarMass('Xy2')).toThrow('未知元素：Xy')
  })
})

describe('formatCounts', () => {
  it('格式化为符号:数量', () => {
    expect(formatCounts(parseFormula('H2O'))).toBe('H:2 O:1')
  })
})

describe('balanceEquation', () => {
  it('H2+O2=H2O → 2,1,2', () => {
    const b = balanceEquation('H2+O2=H2O')
    expect(b.coefficients).toEqual([2, 1, 2])
    expect(b.balanced).toBe('2H2 + O2 = 2H2O')
  })
  it('支持 -> 分隔符：CH4+O2->CO2+H2O', () => {
    const b = balanceEquation('CH4 + O2 -> CO2 + H2O')
    expect(b.coefficients).toEqual([1, 2, 1, 2])
  })
  it('Fe+O2=Fe2O3 → 4,3,2', () => {
    expect(balanceEquation('Fe+O2=Fe2O3').coefficients).toEqual([4, 3, 2])
  })
  it('带括号：Ca(OH)2+H2SO4=CaSO4+H2O → 1,1,1,2', () => {
    expect(balanceEquation('Ca(OH)2+H2SO4=CaSO4+H2O').coefficients).toEqual([1, 1, 1, 2])
  })
  it('负主元消元：NaCl+ClF=NaF+Cl2 → 1,1,1,1', () => {
    const b = balanceEquation('NaCl+ClF=NaF+Cl2')
    expect(b.coefficients).toEqual([1, 1, 1, 1])
    expect(b.reactants).toEqual(['NaCl', 'ClF'])
    expect(b.products).toEqual(['NaF', 'Cl2'])
  })
  it('无分隔符抛中文错误', () => {
    expect(() => balanceEquation('H2+O2')).toThrow('需要用 = 或 -> 分隔')
  })
  it('多个 = 抛格式错误', () => {
    expect(() => balanceEquation('H2=O2=H2O')).toThrow('格式无效')
  })
  it('生成物为空抛中文错误', () => {
    expect(() => balanceEquation('H2=')).toThrow('都不能为空')
  })
  it('反应物为空抛中文错误', () => {
    expect(() => balanceEquation('=H2O')).toThrow('都不能为空')
  })
  it('解不唯一时抛中文错误', () => {
    expect(() => balanceEquation('H2+O2=H2+O2')).toThrow('解不唯一或无解')
  })
  it('惰性气体无法配平时抛中文错误', () => {
    expect(() => balanceEquation('H2+O2=H2O+He')).toThrow('无法配平为正整数系数')
  })
  it('首项系数为零时同样抛中文错误（覆盖 gcd(0,0) 分支）', () => {
    expect(() => balanceEquation('He+H2+O2=H2O')).toThrow('无法配平为正整数系数')
  })
})

describe('ATOMIC_MASS', () => {
  it('包含常见元素', () => {
    expect(ATOMIC_MASS['H']).toBe(1.008)
    expect(ATOMIC_MASS['Fe']).toBe(55.845)
  })
})
