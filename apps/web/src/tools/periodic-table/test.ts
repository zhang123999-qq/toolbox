/**
 * periodic-table（#821）utils 单测：118 元素查询。
 */
import { describe, expect, it } from 'vitest'
import { CATEGORIES, describeElement, ELEMENTS, elementsByCategory, getElement } from './utils'

describe('ELEMENTS', () => {
  it('共 118 个元素且序号连续', () => {
    expect(ELEMENTS).toHaveLength(118)
    ELEMENTS.forEach((el, index) => {
      expect(el.n).toBe(index + 1)
    })
  })
  it('首尾元素正确', () => {
    expect(ELEMENTS[0].symbol).toBe('H')
    expect(ELEMENTS[117].symbol).toBe('Og')
  })
  it('人工合成元素质量用方括号标注', () => {
    expect(getElement('Tc').mass).toBe('[98]')
    expect(getElement('Og').mass).toBe('[294]')
  })
})

describe('getElement', () => {
  it('按符号查询（大小写不敏感）', () => {
    expect(getElement('fe').name).toBe('铁')
    expect(getElement('FE').name).toBe('铁')
  })
  it('按中文名查询', () => {
    expect(getElement('氧').symbol).toBe('O')
  })
  it('按英文名查询（大小写不敏感）', () => {
    expect(getElement('gold').symbol).toBe('Au')
  })
  it('按原子序数查询', () => {
    expect(getElement('26').symbol).toBe('Fe')
  })
  it('空查询抛错', () => {
    expect(() => getElement('  ')).toThrow('查询不能为空')
  })
  it('未知符号抛错', () => {
    expect(() => getElement('Xx')).toThrow('未找到元素「Xx」')
  })
  it('超范围序数抛错', () => {
    expect(() => getElement('200')).toThrow('未找到元素「200」')
  })
})

describe('elementsByCategory', () => {
  it('卤素有 6 个', () => {
    const halogens = elementsByCategory('卤素')
    expect(halogens).toHaveLength(6)
    expect(halogens.map((el) => el.symbol)).toEqual(['F', 'Cl', 'Br', 'I', 'At', 'Ts'])
  })
  it('镧系有 15 个', () => {
    expect(elementsByCategory('镧系')).toHaveLength(15)
  })
  it('全部分类可查', () => {
    const total = CATEGORIES.reduce((sum, cat) => sum + elementsByCategory(cat).length, 0)
    expect(total).toBe(118)
  })
  it('未知分类抛错', () => {
    expect(() => elementsByCategory('金属')).toThrow('未知分类「金属」')
  })
})

describe('describeElement', () => {
  it('主族元素摘要', () => {
    const text = describeElement(getElement('Na'))
    expect(text).toContain('钠（Na，Sodium）')
    expect(text).toContain('第 1 族')
    expect(text).toContain('碱金属')
  })
  it('镧系元素族显示特殊文本', () => {
    expect(describeElement(getElement('La'))).toContain('镧系/锕系')
  })
})
