import { describe, expect, it } from 'vitest'
import { addBom, countBom, hasBom, removeBom, transform } from './utils'

describe('bom / hasBom', () => {
  it('开头带 BOM 才算', () => {
    expect(hasBom('﻿abc')).toBe(true)
    expect(hasBom('abc﻿')).toBe(false)
  })
})

describe('bom / countBom', () => {
  it('统计全文出现次数', () => {
    expect(countBom('﻿a﻿b')).toBe(2)
    expect(countBom('ab')).toBe(0)
  })
})

describe('bom / addBom', () => {
  it('没有就加上', () => {
    expect(addBom('abc')).toBe('﻿abc')
  })

  it('已有则不变（幂等）', () => {
    expect(addBom('﻿abc')).toBe('﻿abc')
  })
})

describe('bom / removeBom', () => {
  it('去掉开头的 BOM', () => {
    expect(removeBom('﻿abc')).toBe('abc')
  })

  it('没有 BOM 时原样返回', () => {
    expect(removeBom('abc')).toBe('abc')
  })
})

describe('bom / transform', () => {
  it('detect 报告开头状态与出现次数', () => {
    const out = transform({ text: '﻿abc' }, { mode: 'detect' })
    expect(out).toContain('开头有 BOM')
    expect(out).toContain('出现次数：1')
  })

  it('正文里还有多余 U+FEFF 时会提示', () => {
    expect(transform({ text: '﻿a﻿' }, { mode: 'detect' })).toContain('注意')
  })

  it('remove 只去掉开头的那一个', () => {
    expect(transform({ text: '﻿a﻿' }, { mode: 'remove' })).toBe('a﻿')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, { mode: 'detect' })).toBe('')
  })
})
