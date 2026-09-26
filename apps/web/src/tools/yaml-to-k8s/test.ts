import { describe, expect, it } from 'vitest'
import { parseYaml, toYaml, transform } from './utils'

describe('yaml-to-k8s / parseYaml', () => {
  it('解析简单 mapping', () => {
    expect(parseYaml('a: 1\nb: two')).toEqual({ a: 1, b: 'two' })
  })

  it('解析嵌套与布尔', () => {
    const node = parseYaml('a:\n  b: true\n  c: null') as Record<string, unknown>
    expect(node).toEqual({ a: { b: true, c: null } })
  })

  it('解析对象数组', () => {
    const node = parseYaml('ports:\n  - containerPort: 80\n    protocol: TCP') as Record<
      string,
      unknown
    >
    expect(node).toEqual({ ports: [{ containerPort: 80, protocol: 'TCP' }] })
  })

  it('解析标量数组', () => {
    const node = parseYaml('list:\n  - a\n  - b') as Record<string, unknown>
    expect(node).toEqual({ list: ['a', 'b'] })
  })

  it('跳过注释与空行', () => {
    expect(parseYaml('# 注释\n\na: 1')).toEqual({ a: 1 })
  })

  it('非法缩进抛中文错', () => {
    expect(() => parseYaml('a: 1\n b: 2')).toThrow(/YAML 缩进异常|无法解析/)
  })
})

describe('yaml-to-k8s / toYaml', () => {
  it('重新序列化嵌套对象', () => {
    const out = toYaml({ a: { b: 1 } })
    expect(out).toBe('a:\n  b: 1')
  })
})

describe('yaml-to-k8s / transform', () => {
  const K8S = [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: web',
    'spec:',
    '  replicas: 3',
  ].join('\n')

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('校验通过', () => {
    const out = transform({ text: K8S }, {})
    expect(out).toContain('✓ apiVersion: apps/v1')
    expect(out).toContain('✓ kind: Deployment')
    expect(out).toContain('✓ metadata.name: web')
  })

  it('缺字段时显示 ✗', () => {
    const out = transform({ text: 'foo: bar' }, {})
    expect(out).toContain('✗ 缺少 apiVersion')
    expect(out).toContain('✗ 缺少 kind')
  })

  it('输出格式化 YAML', () => {
    expect(transform({ text: K8S }, {})).toContain('replicas: 3')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'a: ' + 'x'.repeat(200000) }, {})).toThrow(/上限/)
  })
})
