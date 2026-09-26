import { describe, expect, it } from 'vitest'
import type { AnsibleConfigOptions } from './schema'
import { transform } from './utils'

function opts(over: Partial<AnsibleConfigOptions>): AnsibleConfigOptions {
  return {
    hosts: '',
    taskName: '',
    become: false,
    installPackage: false,
    copyFile: false,
    startService: false,
    manageUser: false,
    ...over,
  }
}

describe('ansible-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts({}))).toBe('')
  })

  it('默认主机组 all', () => {
    expect(transform({ text: 'x' }, opts({ installPackage: true }))).toContain('hosts: "all"')
  })

  it('become 输出 yes', () => {
    expect(transform({ text: 'x' }, opts({ installPackage: true, become: true }))).toContain(
      'become: yes',
    )
  })

  it('四个任务都生成', () => {
    const out = transform(
      { text: 'x' },
      opts({ installPackage: true, copyFile: true, startService: true, manageUser: true }),
    )
    expect(out).toContain('ansible.builtin.apt')
    expect(out).toContain('ansible.builtin.copy')
    expect(out).toContain('ansible.builtin.systemd')
    expect(out).toContain('ansible.builtin.user')
  })

  it('自定义主机组与名称', () => {
    const out = transform(
      { text: 'x' },
      opts({ hosts: 'db', taskName: 'setup db', installPackage: true }),
    )
    expect(out).toContain('- name: "setup db"')
    expect(out).toContain('hosts: "db"')
  })

  it('hosts/name 拒绝换行注入', () => {
    expect(() =>
      transform({ text: 'x' }, opts({ hosts: 'all\nbecome: yes', installPackage: true })),
    ).toThrow(/主机模式/)
    expect(() =>
      transform({ text: 'x' }, opts({ taskName: 'a\n  hosts: x', installPackage: true })),
    ).toThrow(/剧本名称/)
  })

  it('一个任务都不选时报错', () => {
    expect(() => transform({ text: 'x' }, opts({}))).toThrow(/至少选择一个任务/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, opts({ installPackage: true }))).toThrow(
      /上限/,
    )
  })
})
