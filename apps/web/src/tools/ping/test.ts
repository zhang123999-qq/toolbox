import { describe, expect, it } from 'vitest'
import type { PingOptions } from './schema'
import {
  PARAM_NOTES,
  buildCommandSection,
  buildPingCommand,
  buildTcpingCommand,
  transform,
  validateCount,
  validateHost,
  validateInterval,
  validatePacketSize,
} from './utils'

const base: PingOptions = {
  count: '4',
  interval: '1',
  packetSize: '64',
  platform: 'windows',
  httpCheck: false,
}

describe('ping / 校验', () => {
  it('validateHost 接受 IPv4 与主机名', () => {
    expect(validateHost('127.0.0.1')).toBe('127.0.0.1')
    expect(validateHost('example.com')).toBe('example.com')
  })

  it('validateHost 空与非法格式报错', () => {
    expect(() => validateHost('')).toThrow(/请输入目标主机/)
    expect(() => validateHost('999.1.1.1')).toThrow(/地址段非法/)
  })

  it('shell 元字符 host 一律拒绝（命令注入锁定）', () => {
    for (const evil of [
      '8.8.8.8; rm -rf /',
      '8.8.8.8 && id',
      'x$(whoami)',
      'x`id`',
      '8.8.8.8|cat',
    ]) {
      expect(() => validateHost(evil)).toThrow(/格式非法|地址段非法|请输入/)
    }
  })

  it('数值校验：count / interval / packetSize 越界报错', () => {
    expect(validateCount('4')).toBe(4)
    expect(() => validateCount('0')).toThrow(/发包数非法/)
    expect(validateInterval('1.5')).toBe(1.5)
    expect(() => validateInterval('999')).toThrow(/间隔非法/)
    expect(validatePacketSize('64')).toBe(64)
    expect(() => validatePacketSize('70000')).toThrow(/包大小非法/)
  })
})

describe('ping / 命令拼装', () => {
  it('Windows 用 -n/-l，无 -i', () => {
    expect(buildPingCommand('example.com', 4, 1, 64, 'windows')).toBe('ping -n 4 -l 64 example.com')
  })

  it('Linux/macOS 用 -c/-i/-s', () => {
    expect(buildPingCommand('example.com', 4, 1, 64, 'linux')).toBe(
      'ping -c 4 -i 1 -s 64 example.com',
    )
    expect(buildPingCommand('example.com', 10, 0.5, 128, 'macos')).toBe(
      'ping -c 10 -i 0.5 -s 128 example.com',
    )
  })

  it('tcping 命令固定打 80 端口', () => {
    expect(buildTcpingCommand('example.com')).toBe('tcping example.com 80')
  })

  it('buildCommandSection 含命令块与参数说明', () => {
    const out = buildCommandSection('example.com', 4, 1, 64, 'windows')
    expect(out).toContain('ping -n 4 -l 64 example.com')
    expect(out).toContain('tcping example.com 80')
    for (const [flag] of PARAM_NOTES) expect(out).toContain(flag)
  })
})

describe('ping / transform', () => {
  it('空输入返回空串（边界）', async () => {
    expect(await transform({ text: '' }, base)).toBe('')
  })

  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, base)).rejects.toThrow(/上限/)
  })

  it('非法目标 / 非法数值报错', async () => {
    await expect(transform({ text: 'bad host' }, base)).rejects.toThrow(/目标格式非法/)
    await expect(transform({ text: 'example.com' }, { ...base, count: 'x' })).rejects.toThrow(
      /发包数非法/,
    )
  })

  it('默认不开 httpCheck：输出命令与浏览器边界说明，不做网络请求', async () => {
    const out = await transform({ text: 'example.com' }, base)
    expect(out).toContain('浏览器无法发送真实 ICMP')
    expect(out).toContain('ping -n 4 -l 64 example.com')
    expect(out).not.toContain('HTTP 可达性弱检测')
  })

  it('切到 linux 平台命令换成 -c/-i/-s', async () => {
    const out = await transform({ text: 'example.com' }, { ...base, platform: 'linux' })
    expect(out).toContain('ping -c 4 -i 1 -s 64 example.com')
  })
})
