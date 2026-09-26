import { describe, expect, it } from 'vitest'
import { buildCi, transform } from './utils'
import type { CiConfigOptions } from './schema'

const base: CiConfigOptions = {
  branch: 'main',
  nodeVersion: '20',
  install: true,
  test: true,
  build: true,
  deploy: false,
}

describe('ci-config / buildCi', () => {
  it('输出完整的 ci.yml', () => {
    const out = buildCi(base)
    expect(out).toContain('name: CI')
    expect(out).toContain('branches: [ main ]')
    expect(out).toContain("node-version: '20'")
    expect(out).toContain('npm ci')
    expect(out).toContain('npm test')
    expect(out).toContain('npm run build')
  })

  it('关闭 deploy 则不输出部署步骤', () => {
    expect(buildCi(base)).not.toContain('npm run deploy')
    expect(buildCi({ ...base, deploy: true })).toContain('npm run deploy')
  })

  it('关闭 install 则不输出安装步骤', () => {
    expect(buildCi({ ...base, install: false })).not.toContain('npm ci')
  })

  it('空分支回退 main', () => {
    expect(buildCi({ ...base, branch: '' })).toContain('branches: [ main ]')
  })

  it('非法分支名抛错', () => {
    expect(() => buildCi({ ...base, branch: 'bad branch!' })).toThrow(/分支名格式非法/)
  })
})

describe('ci-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 YAML', () => {
    expect(transform({ text: 'go' }, base)).toContain('name: CI')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
