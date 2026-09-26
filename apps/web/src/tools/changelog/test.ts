import { describe, expect, it } from 'vitest'
import { buildChangelog, groupChanges, transform } from './utils'

describe('changelog / groupChanges', () => {
  it('把 feat 归到 Added，fix 归到 Fixed', () => {
    const g = groupChanges('feat: 加 A\nfix: 修 B')
    expect(g.Added).toEqual(['加 A'])
    expect(g.Fixed).toEqual(['修 B'])
  })

  it('无类型前缀的行归入 Changed', () => {
    expect(groupChanges('随便写一行').Changed).toEqual(['随便写一行'])
  })

  it('忽略空行与列表前缀', () => {
    const g = groupChanges('\n- feat: 去掉列表前缀\n   ')
    expect(g.Added).toEqual(['去掉列表前缀'])
  })
})

describe('changelog / buildChangelog', () => {
  it('输出带版本标题与日期', () => {
    const out = buildChangelog('1.2.0', 'feat: x\nfix: y')
    expect(out).toContain('## [1.2.0] -')
    expect(out).toContain('### Added')
    expect(out).toContain('- x')
    expect(out).toContain('### Fixed')
    expect(out).toContain('- y')
  })

  it('未知类型归入 Changed', () => {
    const out = buildChangelog('1.0.0', 'xyz: 模糊')
    expect(out).toContain('### Changed')
    expect(out).toContain('- 模糊')
  })
})

describe('changelog / transform', () => {
  it('输入与版本都空时返回空串', () => {
    expect(transform({ text: '   ' }, { version: '' })).toBe('')
  })

  it('有版本即使无变更也输出标题', () => {
    expect(transform({ text: '' }, { version: '1.0.0' })).toContain('## [1.0.0] -')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(20001) }, { version: '1.0.0' })).toThrow(/上限/)
  })
})
