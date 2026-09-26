import { describe, expect, it } from 'vitest'
import { parseConnection, render, transform } from './utils'

describe('connection-parser / parseConnection', () => {
  it('拆出 host/port/user/password/dbname/params', () => {
    const c = parseConnection('postgresql://admin:s3cr3t@db.example.com:5432/app?sslmode=require')
    expect(c.scheme).toBe('postgresql')
    expect(c.host).toBe('db.example.com')
    expect(c.port).toBe('5432')
    expect(c.user).toBe('admin')
    expect(c.password).toBe('s3cr3t')
    expect(c.dbname).toBe('app')
    expect(c.params.sslmode).toBe('require')
  })

  it('无认证信息时为空', () => {
    const c = parseConnection('redis://localhost:6379/0')
    expect(c.user).toBe('')
    expect(c.dbname).toBe('0')
  })

  it('不支持的 scheme 报错', () => {
    expect(() => parseConnection('mysqlx://localhost:3306/x')).toThrow(/不支持的 scheme/)
  })

  it('非法 URL 报错', () => {
    expect(() => parseConnection('not a url')).toThrow(/无法解析/)
  })
})

describe('connection-parser / render & transform', () => {
  it('密码打码显示', () => {
    const out = render(parseConnection('mysql://root:secret@localhost:3306/app'))
    expect(out).toContain('password：******')
    expect(out).not.toContain('secret')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(5001) }, {})).toThrow(/上限/)
  })
})
