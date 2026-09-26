import { describe, expect, it } from 'vitest'
import { buildHaproxy, buildNginx, parseServers, transform } from './utils'
import type { LbConfigOptions } from './schema'

const base: LbConfigOptions = {
  type: 'nginx',
  servers: '10.0.0.1:8080\n10.0.0.2:8080',
  algorithm: 'round_robin',
  healthCheck: true,
}

describe('lb-config / parseServers', () => {
  it('按行解析 host:port', () => {
    expect(parseServers('10.0.0.1:8080\n10.0.0.2:8080')).toEqual(['10.0.0.1:8080', '10.0.0.2:8080'])
  })

  it('空列表抛错', () => {
    expect(() => parseServers('')).toThrow(/后端服务器列表不能为空/)
  })

  it('非法格式抛错', () => {
    expect(() => parseServers('bad-server')).toThrow(/后端地址格式非法/)
  })
})

describe('lb-config / buildNginx', () => {
  const servers = ['10.0.0.1:8080', '10.0.0.2:8080']

  it('输出 upstream 与 server 块', () => {
    const out = buildNginx(base, servers)
    expect(out).toContain('upstream backend {')
    expect(out).toContain('server 10.0.0.1:8080;')
    expect(out).toContain('server 10.0.0.2:8080;')
    expect(out).toContain('proxy_pass http://backend;')
  })

  it('least_conn 输出 least_conn 指令', () => {
    expect(buildNginx({ ...base, algorithm: 'least_conn' }, servers)).toContain('least_conn;')
  })

  it('ip_hash 输出 ip_hash 指令', () => {
    expect(buildNginx({ ...base, algorithm: 'ip_hash' }, servers)).toContain('ip_hash;')
  })

  it('健康检查输出 health_check', () => {
    expect(buildNginx({ ...base, healthCheck: true }, servers)).toContain('health_check;')
  })
})

describe('lb-config / buildHaproxy', () => {
  const servers = ['10.0.0.1:8080', '10.0.0.2:8080']

  it('输出 backend 段与 balance', () => {
    const out = buildHaproxy(base, servers)
    expect(out).toContain('backend backend')
    expect(out).toContain('balance roundrobin')
    expect(out).toContain('server s1 10.0.0.1:8080 check')
  })

  it('least_conn 映射 leastconn', () => {
    expect(buildHaproxy({ ...base, algorithm: 'least_conn' }, servers)).toContain(
      'balance leastconn',
    )
  })

  it('ip_hash 映射 source', () => {
    expect(buildHaproxy({ ...base, algorithm: 'ip_hash' }, servers)).toContain('balance source')
  })
})

describe('lb-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('按 type 分派 nginx / haproxy', () => {
    expect(transform({ text: 'go' }, base)).toContain('upstream backend')
    expect(transform({ text: 'go' }, { ...base, type: 'haproxy' })).toContain('backend backend')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
