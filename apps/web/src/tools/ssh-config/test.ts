import { describe, expect, it } from 'vitest'
import type { SshConfigOptions } from './schema'
import { assertOptions, buildConfig, transform } from './utils'

const base: SshConfigOptions = {
  host: 'myserver',
  hostname: '1.2.3.4',
  port: '22',
  user: 'root',
  identityFile: '~/.ssh/id_ed25519',
  proxyJump: '',
  forwardAgent: false,
}

describe('ssh-config / buildConfig', () => {
  it('按字段顺序拼出 Host 片段', () => {
    expect(buildConfig(base)).toBe(
      [
        'Host myserver',
        '  HostName 1.2.3.4',
        '  User root',
        '  Port 22',
        '  IdentityFile ~/.ssh/id_ed25519',
      ].join('\n'),
    )
  })

  it('空字段跳过，不输出空指令', () => {
    const out = buildConfig({ ...base, port: '', user: '' })
    expect(out).not.toContain('Port')
    expect(out).not.toContain('User')
    expect(out).toContain('HostName 1.2.3.4')
  })

  it('ProxyJump 与 ForwardAgent 按条件输出', () => {
    const out = buildConfig({ ...base, proxyJump: 'bastion', forwardAgent: true })
    expect(out).toContain('  ProxyJump bastion')
    expect(out).toContain('  ForwardAgent yes')
  })

  it('ForwardAgent 关闭时不输出该指令', () => {
    expect(buildConfig({ ...base, forwardAgent: true }).split('\n')).toContain('  ForwardAgent yes')
    expect(buildConfig(base).split('\n')).not.toContain('  ForwardAgent yes')
  })
})

describe('ssh-config / assertOptions', () => {
  it('Host 必填', () => {
    expect(() => assertOptions({ ...base, host: '   ' })).toThrow(/主机别名/)
  })

  it('Host 不能含空白', () => {
    expect(() => assertOptions({ ...base, host: 'my server' })).toThrow(/不能包含空白/)
  })

  it('端口必须是数字', () => {
    expect(() => assertOptions({ ...base, port: 'ssh' })).toThrow(/端口/)
    expect(() => assertOptions({ ...base, port: '22' })).not.toThrow()
    expect(() => assertOptions({ ...base, port: '' })).not.toThrow()
  })

  it('端口越界报错', () => {
    expect(() => assertOptions({ ...base, port: '70000' })).toThrow(/1-65535/)
  })

  it('各字段拒绝换行注入', () => {
    expect(() => assertOptions({ ...base, host: 'a\nUser attacker' })).toThrow(/不能包含/)
    expect(() => assertOptions({ ...base, hostname: 'h\nUser x' })).toThrow()
    expect(() => assertOptions({ ...base, user: 'r\nPort 22' })).toThrow()
    expect(() => assertOptions({ ...base, proxyJump: 'b\nUser x' })).toThrow()
    expect(() => assertOptions({ ...base, identityFile: '/k\nUser x' })).toThrow()
  })
})

describe('ssh-config / transform', () => {
  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('输出带注释头与配置体', () => {
    const out = transform({ text: 'x' }, base)
    expect(out.startsWith('# 追加到')).toBe(true)
    expect(out).toContain('Host myserver')
  })

  it('非法配置抛中文错误', () => {
    expect(() => transform({ text: 'x' }, { ...base, host: '' })).toThrow(/主机别名/)
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
