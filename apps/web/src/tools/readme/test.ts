import { describe, expect, it } from 'vitest'
import type { ReadmeOptions } from './schema'
import { buildReadme, parseFeatures, transform } from './utils'

const base: ReadmeOptions = { projectName: 'my-utils', description: '轻量工具库', license: 'MIT' }

describe('readme / parseFeatures', () => {
  it('按行拆分并去掉列表前缀', () => {
    expect(parseFeatures('- 零依赖\n* TS\n\n')).toEqual(['零依赖', 'TS'])
  })
})

describe('readme / buildReadme', () => {
  it('包含标题 / 功能 / 安装 / 使用 / 许可证', () => {
    const out = buildReadme(base, '零依赖')
    expect(out).toContain('# my-utils')
    expect(out).toContain('轻量工具库')
    expect(out).toContain('## 功能特性')
    expect(out).toContain('- 零依赖')
    expect(out).toContain('npm install my-utils')
    expect(out).toContain("import { example } from 'my-utils'")
    expect(out).toContain('MIT 许可证')
  })

  it('无功能时给占位', () => {
    expect(buildReadme(base, '')).toContain('- （待补充）')
  })
})

describe('readme / transform', () => {
  it('项目名与输入都空时返回空串', () => {
    expect(transform({ text: '' }, { ...base, projectName: '' })).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(20001) }, base)).toThrow(/上限/)
  })

  it('正常生成 README', () => {
    expect(transform({ text: 'A\nB' }, base)).toContain('- A')
  })
})
