import { describe, expect, it } from 'vitest'
import type { CommitGenOptions } from './schema'
import { assertType, buildCommit, transform } from './utils'

const base: CommitGenOptions = {
  type: 'feat',
  scope: 'auth',
  description: '新增手机号登录',
  body: '',
  breaking: false,
  footer: '',
}

describe('commit-gen / buildCommit', () => {
  it('带 scope 时输出 type(scope): subject', () => {
    expect(buildCommit(base)).toBe('feat(auth): 新增手机号登录')
  })

  it('无 scope 时省略括号', () => {
    expect(buildCommit({ ...base, scope: '' })).toBe('feat: 新增手机号登录')
  })

  it('body 与 header 之间空一行', () => {
    const out = buildCommit({ ...base, body: '调用短信网关\n支持验证码重发' })
    expect(out).toBe('feat(auth): 新增手机号登录\n\n调用短信网关\n支持验证码重发')
  })

  it('breaking 追加 BREAKING CHANGE 段', () => {
    expect(buildCommit({ ...base, breaking: true })).toContain(
      'BREAKING CHANGE: 本次提交包含不兼容的 API 变更',
    )
  })

  it('footer 追加在末尾', () => {
    expect(buildCommit({ ...base, footer: 'Closes #123' })).toBe(
      'feat(auth): 新增手机号登录\n\nCloses #123',
    )
  })

  it('描述为空报错', () => {
    expect(() => buildCommit({ ...base, description: '   ' })).toThrow(/请填写提交描述/)
  })

  it('非法 type 报错', () => {
    expect(() => assertType('wip')).toThrow(/不支持的提交类型/)
  })
})

describe('commit-gen / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即生成提交信息', () => {
    expect(transform({ text: 'x' }, base)).toBe('feat(auth): 新增手机号登录')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
