/**
 * edge-auth（#818）utils 单测：鉴权代码生成与 Basic 头解析。
 */
import { describe, expect, it } from 'vitest'
import {
  escapeJs,
  EXAMPLE_BASIC_HEADER,
  generateBasicAuthWorker,
  generateJwtVerifySnippet,
  parseBasicAuthHeader,
} from './utils'

describe('generateBasicAuthWorker', () => {
  it('生成含 realm 的代码', () => {
    const code = generateBasicAuthWorker({ realm: 'admin' })
    expect(code).toContain('Basic realm="admin"')
    expect(code).toContain('401')
  })
  it('预置账号时生成比对逻辑', () => {
    const code = generateBasicAuthWorker({ realm: 'x', username: 'u', password: 'p' })
    expect(code).toContain("btoa('u:p')")
  })
  it('仅填用户名不生成比对', () => {
    const code = generateBasicAuthWorker({ realm: 'x', username: 'u' })
    expect(code).toContain('仅校验请求携带了 Authorization 头')
  })
  it('realm 为空抛错', () => {
    expect(() => generateBasicAuthWorker({ realm: '  ' })).toThrow('realm 不能为空')
  })
  it('特殊字符转义', () => {
    const code = generateBasicAuthWorker({ realm: "a'b\\c", username: 'u', password: 'p' })
    expect(code).toContain("a\\'b\\\\c")
  })
})

describe('escapeJs', () => {
  it('转义单引号与反斜杠', () => {
    expect(escapeJs("a'b\\c")).toBe("a\\'b\\\\c")
  })
  it('普通字符串不变', () => {
    expect(escapeJs('abc')).toBe('abc')
  })
})

describe('generateJwtVerifySnippet', () => {
  it('默认生成片段', () => {
    const code = generateJwtVerifySnippet({})
    expect(code).toContain('verifyJwt')
    expect(code).toContain('未填写，部署时配置')
    expect(code).toContain('可在此追加 iss / aud 断言')
  })
  it('带 JWKS 与声明校验', () => {
    const code = generateJwtVerifySnippet({
      jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
      issuer: 'https://auth.example.com',
      audience: 'my-app',
    })
    expect(code).toContain('https://auth.example.com/.well-known/jwks.json')
    expect(code).toContain("payload.iss !== 'https://auth.example.com'")
    expect(code).toContain("payload.aud !== 'my-app'")
  })
  it('仅 issuer', () => {
    const code = generateJwtVerifySnippet({ issuer: 'iss' })
    expect(code).toContain("payload.iss !== 'iss'")
    expect(code).not.toContain('payload.aud')
  })
  it('非 https JWKS 抛错', () => {
    expect(() => generateJwtVerifySnippet({ jwksUrl: 'http://a.com/jwks' })).toThrow(
      'JWKS 地址须为 https URL',
    )
  })
  it('畸形 JWKS 抛错', () => {
    expect(() => generateJwtVerifySnippet({ jwksUrl: 'not a url' })).toThrow('JWKS 地址格式非法')
  })
})

describe('parseBasicAuthHeader', () => {
  it('解析示例头', () => {
    expect(parseBasicAuthHeader(EXAMPLE_BASIC_HEADER)).toEqual({
      username: 'user',
      password: 'password',
    })
  })
  it('大小写不敏感', () => {
    expect(parseBasicAuthHeader('BASIC dXNlcjpwYXNzd29yZA==').username).toBe('user')
  })
  it('密码含冒号保留', () => {
    expect(parseBasicAuthHeader('Basic ' + btoa('u:p:a'))).toEqual({
      username: 'u',
      password: 'p:a',
    })
  })
  it('非 Basic 抛错', () => {
    expect(() => parseBasicAuthHeader('Bearer abc')).toThrow('须为 Basic 类型的 Authorization 头')
  })
  it('凭据缺失（仅 Basic 前缀）抛错', () => {
    expect(() => parseBasicAuthHeader('Basic')).toThrow('须为 Basic 类型的 Authorization 头')
  })
  it('Base64 非法抛错', () => {
    expect(() => parseBasicAuthHeader('Basic !!!')).toThrow('Base64 解码失败')
  })
  it('缺冒号抛错', () => {
    expect(() => parseBasicAuthHeader('Basic ' + btoa('nocolon'))).toThrow(
      '凭据格式非法，缺少冒号分隔符',
    )
  })
})
