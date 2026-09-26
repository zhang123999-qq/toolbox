import { describe, expect, it } from 'vitest'
import type { DbConnectionOptions } from './schema'
import { buildConnection, transform } from './utils'

const base: DbConnectionOptions = {
  dbType: 'mysql',
  host: 'localhost',
  port: '',
  user: 'root',
  password: 'secret',
  dbname: 'app',
}

describe('db-connection / buildConnection', () => {
  it('mysql 拼出标准连接串', () => {
    expect(buildConnection(base)).toBe('mysql://root:secret@localhost:3306/app')
  })

  it('postgresql 默认端口 5432', () => {
    expect(buildConnection({ ...base, dbType: 'postgresql' })).toBe(
      'postgresql://root:secret@localhost:5432/app',
    )
  })

  it('mongodb 带库名', () => {
    expect(buildConnection({ ...base, dbType: 'mongodb' })).toBe(
      'mongodb://root:secret@localhost:27017/app',
    )
  })

  it('redis 无 auth 时不拼用户信息', () => {
    expect(buildConnection({ ...base, dbType: 'redis', user: '', password: '' })).toBe(
      'redis://localhost:6379',
    )
  })

  it('sqlite 用文件路径', () => {
    expect(buildConnection({ ...base, dbType: 'sqlite', dbname: '/tmp/app.db' })).toBe(
      'sqlite:///tmp/app.db',
    )
  })

  it('特殊字符 URL 编码', () => {
    expect(buildConnection({ ...base, password: 'a b@c' })).toContain('root:a%20b%40c@')
  })

  it('主机拒绝分隔符/空白/换行注入', () => {
    expect(() => buildConnection({ ...base, host: 'localhost@evil.com' })).toThrow(/非法字符/)
    expect(() => buildConnection({ ...base, host: 'h\nevil: x' })).toThrow(/非法字符/)
    expect(() => buildConnection({ ...base, host: '999.1.1.1' })).toThrow(/IPv4/)
  })

  it('端口必须在 1-65535', () => {
    expect(() => buildConnection({ ...base, port: 'abc' })).toThrow(/端口/)
    expect(() => buildConnection({ ...base, port: '70000' })).toThrow(/1-65535/)
    expect(buildConnection({ ...base, port: '3307' })).toContain('localhost:3307')
  })

  it('sqlite 路径拒绝空白/换行', () => {
    expect(() => buildConnection({ ...base, dbType: 'sqlite', dbname: '/tmp/a b.db' })).toThrow(
      /SQLite/,
    )
  })
})

describe('db-connection / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('非空输入生成连接串', () => {
    expect(transform({ text: 'x' }, base)).toContain('mysql://')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
