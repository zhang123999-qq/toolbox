import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const K8S = JSON.stringify({
  apiVersion: 'v1',
  kind: 'Service',
  metadata: { name: 'web' },
  spec: { type: 'ClusterIP', ports: [{ port: 80 }] },
})

describe('json-to-k8s / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('校验通过', () => {
    const out = transform({ text: K8S }, {})
    expect(out).toContain('✓ apiVersion: v1')
    expect(out).toContain('✓ kind: Service')
    expect(out).toContain('✓ metadata.name: web')
  })

  it('输出格式化 JSON', () => {
    expect(transform({ text: K8S }, {})).toContain('"apiVersion": "v1"')
  })

  it('输出等价 YAML', () => {
    const out = transform({ text: K8S }, {})
    expect(out).toContain('apiVersion: v1')
    expect(out).toContain('kind: Service')
    expect(out).toContain('- port: 80')
  })

  it('非法 JSON 抛中文错', () => {
    expect(() => transform({ text: '{oops' }, {})).toThrow(/不是合法的 JSON/)
  })

  it('顶层非对象报错', () => {
    expect(() => transform({ text: '[1,2]' }, {})).toThrow(/顶层必须是/)
  })

  it('空数组与空对象序列化为 [] / {} 而非孤立 key', () => {
    const out = transform({ text: '{"spec":{},"args":[]}' }, {})
    expect(out).toContain('spec: {}')
    expect(out).toContain('args: []')
  })

  it('缺字段显示 ✗', () => {
    expect(transform({ text: '{"a":1}' }, {})).toContain('✗ 缺少 apiVersion')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '{"a":"' + 'x'.repeat(200000) + '"}' }, {})).toThrow(/上限/)
  })
})
