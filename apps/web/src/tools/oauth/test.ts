import { describe, expect, it } from 'vitest'
import type { OAuthOptions } from './schema'
import { renderFlow, transform } from './utils'

const AC: OAuthOptions = { flow: 'authorization-code' }

describe('oauth / renderFlow', () => {
  it('授权码流程给出步骤与换 token 说明', () => {
    const out = renderFlow('authorization-code')
    expect(out).toContain('response_type=code')
    expect(out).toContain('grant_type=authorization_code')
    expect(out).toContain('state')
  })

  it('隐式流程说明 token 在 fragment 且不推荐', () => {
    const out = renderFlow('implicit')
    expect(out).toContain('response_type=token')
    expect(out).toContain('不推荐')
  })

  it('客户端凭证流程无用户参与', () => {
    const out = renderFlow('client-credentials')
    expect(out).toContain('grant_type=client_credentials')
    expect(out).toContain('机器对机器')
  })

  it('非法 flow 报错', () => {
    expect(() => renderFlow('ropc')).toThrow(/不支持的流程/)
  })
})

describe('oauth / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, AC)).toBe('')
  })

  it('按 flow 分派', () => {
    expect(transform({ text: 'x' }, AC)).toContain('授权码流程')
    expect(transform({ text: 'x' }, { flow: 'implicit' })).toContain('隐式流程')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, AC)).toThrow(/上限/)
  })
})
