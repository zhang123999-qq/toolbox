import { describe, expect, it } from 'vitest'
import type { NginxConfigOptions } from './schema'
import { transform } from './utils'

const base: NginxConfigOptions = {
  serverName: '',
  listen: '',
  root: '',
  proxyPass: '',
  ssl: false,
  gzip: false,
}

describe('nginx-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('默认静态站点', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('listen 80;')
    expect(out).toContain('server_name example.com;')
    expect(out).toContain('root /usr/share/nginx/html;')
  })

  it('填写 proxyPass 时输出反向代理', () => {
    const out = transform({ text: 'x' }, { ...base, proxyPass: 'http://127.0.0.1:3000' })
    expect(out).toContain('proxy_pass http://127.0.0.1:3000;')
    expect(out).toContain('proxy_set_header X-Real-IP')
    expect(out).not.toContain('root /usr/share/nginx/html;')
  })

  it('ssl 自动切到 443 并写证书路径', () => {
    const out = transform({ text: 'x' }, { ...base, ssl: true })
    expect(out).toContain('listen 443 ssl;')
    expect(out).toContain('ssl_certificate')
  })

  it('gzip 输出压缩段', () => {
    expect(transform({ text: 'x' }, { ...base, gzip: true })).toContain('gzip on;')
  })

  it('自定义域名与端口', () => {
    const out = transform({ text: 'x' }, { ...base, serverName: 'api.foo.com', listen: '8080' })
    expect(out).toContain('server_name api.foo.com;')
    expect(out).toContain('listen 8080;')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('拒绝域名/端口/路径/反代中的换行注入', () => {
    expect(() => transform({ text: 'x' }, { ...base, serverName: 'a;\nadd_header X 1;' })).toThrow()
    expect(() => transform({ text: 'x' }, { ...base, listen: '80;\nroot /x;' })).toThrow()
    expect(() => transform({ text: 'x' }, { ...base, root: '/a\nb { }' })).toThrow()
    expect(() =>
      transform({ text: 'x' }, { ...base, proxyPass: 'http://x\nadd_header X 1;' }),
    ).toThrow()
  })

  it('监听端口范围与非数字校验', () => {
    expect(() => transform({ text: 'x' }, { ...base, listen: '99999' })).toThrow(/1-65535/)
    expect(() => transform({ text: 'x' }, { ...base, listen: 'abc' })).toThrow(/listen/)
  })

  it('root 非绝对路径报错', () => {
    expect(() => transform({ text: 'x' }, { ...base, root: 'relative/dir' })).toThrow(/绝对路径/)
  })
})
