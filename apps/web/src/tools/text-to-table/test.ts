import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('text-to-table / transform', () => {
  it('grid 版式有边框，且在表头下加一条分隔线', () => {
    const out = transform(
      { text: 'name,age\nBob,7' },
      { delimiter: 'comma', style: 'grid', header: true },
    )
    const lines = out.split('\n')
    expect(lines[0]).toMatch(/^\+-+\+-+\+$/)
    expect(lines[2]).toMatch(/^\+-+\+-+\+$/)
    expect(out).toContain('| Bob ')
  })

  it('plain 版式只做对齐、不带边框', () => {
    const out = transform(
      { text: 'name,age\nBob,7' },
      { delimiter: 'comma', style: 'plain', header: true },
    )
    expect(out).not.toContain('|')
    expect(out.split('\n')[0]).toBe('name  age')
  })

  it('中日韩字符按两个字符宽度对齐', () => {
    const out = transform(
      { text: '姓名,年龄\n张三,28' },
      { delimiter: 'comma', style: 'plain', header: true },
    )
    const [head, row] = out.split('\n')
    // 「年龄」与「28」在两行里的起始下标相同，说明视觉上对齐
    expect(head.indexOf('年龄')).toBe(row.indexOf('28'))
  })

  it('space 分隔符按两个及以上空白切分', () => {
    const out = transform(
      { text: 'a    b\n1    2' },
      { delimiter: 'space', style: 'plain', header: false },
    )
    expect(out).toBe('a  b\n1  2')
  })

  it('行长度不齐时按空串补齐', () => {
    const out = transform(
      { text: 'a,b,c\n1' },
      { delimiter: 'comma', style: 'plain', header: false },
    )
    expect(out).toBe('a  b  c\n1')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, { delimiter: 'auto', style: 'grid', header: true })).toBe('')
  })
})
