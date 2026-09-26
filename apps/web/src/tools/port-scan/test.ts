import { describe, expect, it } from 'vitest'
import type { PortScanOptions } from './schema'
import {
  COMMON_PORTS,
  PORT_STATES,
  buildBashTcp,
  buildNc,
  buildNmap,
  buildPowerShell,
  parsePorts,
  scanTypeFlag,
  speedFlag,
  transform,
  validateHost,
} from './utils'

const base: PortScanOptions = {
  ports: '1-1000',
  scanType: 'connect',
  speed: 'normal',
}

describe('port-scan / validateHost', () => {
  it('接受合法 IPv4', () => {
    expect(validateHost('192.168.1.1')).toBe('192.168.1.1')
  })

  it('接受合法主机名并 trim', () => {
    expect(validateHost('  example.com  ')).toBe('example.com')
  })

  it('空目标报错', () => {
    expect(() => validateHost('   ')).toThrow(/请输入目标主机/)
  })

  it('IPv4 段超过 255 报错', () => {
    expect(() => validateHost('999.1.1.1')).toThrow(/地址段非法/)
  })

  it('含空格的非法目标报错', () => {
    expect(() => validateHost('example com')).toThrow(/目标格式非法/)
  })

  it('shell 元字符 host 一律拒绝（命令注入锁定）', () => {
    for (const evil of [
      '8.8.8.8; rm -rf /',
      '8.8.8.8 && id',
      'x$(whoami)',
      'x`id`',
      '8.8.8.8|cat',
      '-oX',
    ]) {
      expect(() => validateHost(evil)).toThrow(/格式非法|地址段非法|请输入/)
      expect(() => transform({ text: evil }, base)).toThrow()
    }
  })
})

describe('port-scan / parsePorts', () => {
  it('单一区间生成 seq 与 PowerShell 区间写法', () => {
    const p = parsePorts('1-1000')
    expect(p.nmap).toBe('1-1000')
    expect(p.shell).toBe('$(seq 1 1000)')
    expect(p.ps).toBe('1..1000')
  })

  it('离散端口列表生成空格 / 逗号分隔', () => {
    const p = parsePorts('22,80,443')
    expect(p.shell).toBe('22 80 443')
    expect(p.ps).toBe('22,80,443')
  })

  it('区间与离散混写：shell/PS 不得丢弃区间', () => {
    const p = parsePorts('22,80-90')
    expect(p.nmap).toBe('22,80-90')
    expect(p.shell).toBe('$(seq 80 90) 22')
    expect(p.ps).toBe('80..90,22')
  })

  it('多区间：每段都生成 seq / 区间运算符，不互相覆盖', () => {
    const p = parsePorts('1-100,200-300')
    expect(p.nmap).toBe('1-100,200-300')
    expect(p.shell).toBe('$(seq 1 100) $(seq 200 300)')
    expect(p.ps).toBe('1..100,200..300')
  })

  it('逗号后多余空格被规范化，不影响 nmap -p 实参', () => {
    const p = parsePorts('22, 80-90')
    expect(p.nmap).toBe('22,80-90')
    expect(p.shell).toBe('$(seq 80 90) 22')
  })

  it('端口超出 1-65535 报错', () => {
    expect(() => parsePorts('70000')).toThrow(/须在 1-65535/)
    expect(() => parsePorts('0')).toThrow(/须在 1-65535/)
  })

  it('区间起点大于终点报错', () => {
    expect(() => parsePorts('100-80')).toThrow(/起点不大于终点/)
  })

  it('非法段格式报错', () => {
    expect(() => parsePorts('abc')).toThrow(/端口段格式非法/)
  })
})

describe('port-scan / flag 与命令拼装', () => {
  it('scanTypeFlag 映射 nmap 标志', () => {
    expect(scanTypeFlag('connect')).toBe('-sT')
    expect(scanTypeFlag('syn')).toBe('-sS')
    expect(scanTypeFlag('udp')).toBe('-sU')
  })

  it('speedFlag：快=-T4，慢=-T2，正常为空', () => {
    expect(speedFlag('fast')).toBe('-T4')
    expect(speedFlag('slow')).toBe('-T2')
    expect(speedFlag('normal')).toBe('')
  })

  it('buildNmap 按类型/速度拼命令', () => {
    const p = parsePorts('1-1000')
    expect(buildNmap('example.com', p, base)).toBe('nmap -sT -p 1-1000 -sV example.com')
    expect(buildNmap('example.com', p, { ...base, speed: 'fast' })).toBe(
      'nmap -sT -T4 -p 1-1000 -sV example.com',
    )
    expect(buildNmap('example.com', p, { ...base, scanType: 'udp' })).toBe(
      'nmap -sU -p 1-1000 -sV example.com',
    )
  })

  it('buildNc / buildPowerShell / buildBashTcp 都带目标主机', () => {
    const p = parsePorts('22,80')
    expect(buildNc('example.com', p)).toContain('nc -zv -w 2 example.com $p')
    expect(buildPowerShell('example.com', p)).toContain("$target = 'example.com'")
    expect(buildPowerShell('example.com', p)).toContain('$ports  = 22,80')
    expect(buildBashTcp('example.com', p)).toContain('host=example.com')
  })
})

describe('port-scan / transform', () => {
  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('非法主机报错进入 alert', () => {
    expect(() => transform({ text: 'bad host' }, base)).toThrow(/目标格式非法/)
  })

  it('输出含四种命令、状态说明与常见端口表', () => {
    const out = transform({ text: 'example.com' }, base)
    expect(out).toContain('浏览器无法发起真实')
    expect(out).toContain('nmap -sT -p 1-1000 -sV example.com')
    expect(out).toContain('Test-NetConnection')
    expect(out).toContain('/dev/tcp/$host/$p')
    for (const [state] of PORT_STATES) expect(out).toContain(state)
    for (const [port, svc] of COMMON_PORTS) expect(out).toContain(`${port}/tcp：${svc}`)
  })
})
