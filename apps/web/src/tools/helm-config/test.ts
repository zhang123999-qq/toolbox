import { describe, expect, it } from 'vitest'
import type { HelmConfigOptions } from './schema'
import { transform } from './utils'

const base: HelmConfigOptions = { chartName: '', version: '', description: '' }

describe('helm-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('默认 Chart 名 mychart', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('apiVersion: v2')
    expect(out).toContain('name: mychart')
    expect(out).toContain('version: 0.1.0')
  })

  it('自定义名称与版本', () => {
    const out = transform(
      { text: 'x' },
      { chartName: 'web', version: '1.2.3', description: 'web 服务' },
    )
    expect(out).toContain('name: web')
    expect(out).toContain('version: 1.2.3')
    expect(out).toContain('description: "web 服务"')
  })

  it('名称/版本/描述拒绝换行注入', () => {
    expect(() =>
      transform({ text: 'x' }, { chartName: 'a\nbad: x', version: '', description: '' }),
    ).toThrow(/Chart 名称/)
    expect(() =>
      transform({ text: 'x' }, { chartName: 'web', version: '1.2\nx: y', description: '' }),
    ).toThrow(/语义化版本/)
    expect(() =>
      transform({ text: 'x' }, { chartName: 'web', version: '', description: 'a\nb: c' }),
    ).toThrow(/描述/)
  })

  it('输出目录结构与 values', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('templates/')
    expect(out).toContain('replicaCount: 1')
    expect(out).toContain('appVersion: "1.0.0"')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
