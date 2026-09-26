import { describe, expect, it } from 'vitest'
import type { MakefileOptions } from './schema'
import { assertOptions, buildMakefile, parseDeps, transform } from './utils'

const base: MakefileOptions = {
  targetName: 'build',
  deps: '',
  command: '@echo done',
}

describe('makefile / parseDeps', () => {
  it('按空白拆分并去重保序', () => {
    expect(parseDeps('a b  a c')).toEqual(['a', 'b', 'c'])
    expect(parseDeps('')).toEqual([])
    expect(parseDeps('  pkg.tar.gz  ')).toEqual(['pkg.tar.gz'])
  })
})

describe('makefile / buildMakefile', () => {
  it('输出包含 .PHONY 与变量区，配方行以 Tab 开头', () => {
    const out = buildMakefile(base)
    expect(out).toContain('.PHONY: build')
    expect(out).toContain('APP := myapp')
    expect(out).toContain('\t@echo done')
  })

  it('带依赖时目标行追加依赖', () => {
    const out = buildMakefile({ ...base, deps: 'clean setup' })
    expect(out).toContain('build: clean setup')
  })

  it('空依赖时目标行不带尾随空格', () => {
    const out = buildMakefile(base)
    expect(out).toContain('build:')
    expect(out).not.toContain('build: ')
  })

  it('多行命令逐行加 Tab', () => {
    const out = buildMakefile({ ...base, command: 'mkdir -p build\ntouch build/app' })
    expect(out).toContain('\tmkdir -p build\n\ttouch build/app')
  })

  it('非法目标名报错', () => {
    expect(() => assertOptions({ ...base, targetName: 'bad target!' })).toThrow(/目标名/)
  })

  it('空命令报错', () => {
    expect(() => assertOptions({ ...base, command: '   ' })).toThrow(/命令/)
  })

  it('非法依赖名报错（防 ; 注入内联配方）', () => {
    expect(() => assertOptions({ ...base, deps: 'x;rm -rf /' })).toThrow(/依赖名/)
    expect(() => buildMakefile({ ...base, deps: 'a b:c' })).toThrow(/依赖名/)
    expect(() => assertOptions({ ...base, deps: 'clean setup' })).not.toThrow()
  })
})

describe('makefile / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('非空输入生成 Makefile', () => {
    expect(transform({ text: 'x' }, base)).toContain('.PHONY: build')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
