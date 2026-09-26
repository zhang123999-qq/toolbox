import { describe, expect, it } from 'vitest'
import type { K8sConfigOptions } from './schema'
import { transform } from './utils'

const base: K8sConfigOptions = {
  kind: 'Deployment',
  name: '',
  image: '',
  port: '',
  replicas: '',
}

describe('k8s-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('Deployment 输出完整工作负载', () => {
    const out = transform({ text: 'x' }, { ...base, name: 'web', replicas: '3' })
    expect(out).toContain('apiVersion: apps/v1')
    expect(out).toContain('kind: Deployment')
    expect(out).toContain('  name: web')
    expect(out).toContain('  replicas: 3')
    expect(out).toContain('image: nginx:alpine')
    expect(out).toContain('containerPort: 80')
  })

  it('Service 输出 ClusterIP', () => {
    const out = transform({ text: 'x' }, { ...base, kind: 'Service', name: 'api' })
    expect(out).toContain('kind: Service')
    expect(out).toContain('type: ClusterIP')
    expect(out).toContain('targetPort: 80')
  })

  it('ConfigMap 带 data 段', () => {
    expect(transform({ text: 'x' }, { ...base, kind: 'ConfigMap', name: 'cfg' })).toContain(
      'data:\n  app.properties: |',
    )
  })

  it('Ingress 使用 networking.k8s.io/v1', () => {
    expect(transform({ text: 'x' }, { ...base, kind: 'Ingress', name: 'ing' })).toContain(
      'apiVersion: networking.k8s.io/v1',
    )
  })

  it('PVC 申请 1Gi', () => {
    const out = transform({ text: 'x' }, { ...base, kind: 'PersistentVolumeClaim', name: 'data' })
    expect(out).toContain('kind: PersistentVolumeClaim')
    expect(out).toContain('storage: 1Gi')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('拒绝名称中的换行/冒号注入', () => {
    expect(() => transform({ text: 'x' }, { ...base, name: 'a\nevil: hacked' })).toThrow()
    expect(() => transform({ text: 'x' }, { ...base, name: 'a:b' })).toThrow()
    expect(() => transform({ text: 'x' }, { ...base, name: 'UPPER' })).toThrow()
  })

  it('拒绝镜像中的换行注入', () => {
    expect(() => transform({ text: 'x' }, { ...base, image: 'x\n    privileged: true' })).toThrow(
      /镜像/,
    )
  })

  it('端口必须是 1-65535 整数', () => {
    expect(() => transform({ text: 'x' }, { ...base, port: 'abc' })).toThrow(/端口/)
    expect(() => transform({ text: 'x' }, { ...base, port: '0' })).toThrow(/端口/)
    expect(() => transform({ text: 'x' }, { ...base, port: '70000' })).toThrow(/端口/)
    expect(() => transform({ text: 'x' }, { ...base, port: '8.5' })).toThrow(/端口/)
    expect(transform({ text: 'x' }, { ...base, port: '443' })).toContain('containerPort: 443')
  })

  it('副本数必须是非负整数', () => {
    expect(() => transform({ text: 'x' }, { ...base, replicas: '-3' })).toThrow(/副本/)
    expect(() => transform({ text: 'x' }, { ...base, replicas: '1.5' })).toThrow(/副本/)
    expect(transform({ text: 'x' }, { ...base, replicas: '0' })).toContain('replicas: 0')
  })
})
