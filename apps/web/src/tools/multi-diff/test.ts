import { describe, expect, it } from 'vitest'
import { parseBlocks, transform } from './utils'

describe('multi-diff / parseBlocks', () => {
  it('按 === 标记切分出多个块', () => {
    const blocks = parseBlocks('=== a.txt\nx\n=== b.txt\ny')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].name).toBe('a.txt')
    expect(blocks[1].lines).toEqual(['y'])
  })

  it('标记之前的正文也算一个块', () => {
    const blocks = parseBlocks('x\ny\n=== b\nz')
    expect(blocks[0].name).toBe('文件 1')
    expect(blocks[0].lines).toEqual(['x', 'y'])
  })

  it('空标记名回退为「未命名」', () => {
    expect(parseBlocks('===   \nx')[0].name).toBe('未命名')
  })
})

describe('multi-diff / transform', () => {
  const base = { mode: 'line' } as const

  it('以首个块为基准逐个对比', () => {
    const out = transform({ text: '=== a\n1\n2\n=== b\n1\n3\n=== c\n1\n2\n4' }, base)
    expect(out).toContain('基准：a')
    expect(out).toContain('--- 与 b 的差异')
    expect(out).toContain('--- 与 c 的差异')
    expect(out).toContain('+ 3')
    expect(out).toContain('+ 4')
  })

  it('字符级对比', () => {
    const out = transform({ text: '=== a\nabc\n=== b\nabd' }, { mode: 'char' })
    expect(out).toContain('- c')
    expect(out).toContain('+ d')
  })

  it('只有一个块时给出提示', () => {
    const out = transform({ text: '=== a\nx' }, base)
    expect(out).toContain('无法对比')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
