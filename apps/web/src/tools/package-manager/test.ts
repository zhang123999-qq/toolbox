import { describe, expect, it } from 'vitest'
import { COMMANDS, buildCheatsheet, transform } from './utils'

describe('package-manager / buildCheatsheet', () => {
  it('pnpm 列输出 pnpm 命令', () => {
    const out = buildCheatsheet('pnpm')
    expect(out).toContain('# pnpm 常用命令速查')
    expect(out).toContain('`pnpm install`')
    expect(out).toContain('`pnpm add -D <pkg>`')
    expect(out).not.toContain('`npm install`')
  })

  it('npm 列输出 npm 命令', () => {
    const out = buildCheatsheet('npm')
    expect(out).toContain('`npm install`')
    expect(out).toContain('`npm audit fix`')
  })

  it('yarn 列输出 yarn 命令', () => {
    const out = buildCheatsheet('yarn')
    expect(out).toContain('`yarn`')
    expect(out).toContain('`yarn publish`')
  })

  it('至少覆盖 18 个常用动作', () => {
    expect(COMMANDS.length).toBeGreaterThanOrEqual(18)
  })

  it('非法包管理器报错', () => {
    expect(() => buildCheatsheet('bun' as 'npm')).toThrow(/不支持的包管理器/)
  })
})

describe('package-manager / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { pm: 'pnpm' })).toBe('')
  })

  it('非空输入生成表格', () => {
    expect(transform({ text: 'x' }, { pm: 'npm' })).toContain('| 动作 | 命令 |')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { pm: 'pnpm' })).toThrow(/上限/)
  })
})
