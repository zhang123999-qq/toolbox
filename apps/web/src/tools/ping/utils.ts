import type { PingInput, PingOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示为 role=alert */
export class PingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PingError'
  }
}

export const MAX_INPUT = 200_000

export const PLATFORMS = ['windows', 'linux', 'macos'] as const

/** 校验目标主机：IPv4 或 DNS 主机名（本工具目录内自包含，不跨工具 import） */
export function validateHost(raw: string): string {
  const host = raw.trim()
  if (host === '') {
    throw new PingError('请输入目标主机或 IP（如 127.0.0.1 或 example.com）')
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const m = host.match(ipv4)
  if (m) {
    for (const octet of m.slice(1)) {
      if (Number(octet) > 255) {
        throw new PingError(`IPv4 地址段非法：${octet}（每段须在 0-255 之间）`)
      }
    }
    return host
  }
  const hostname =
    /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
  if (!hostname.test(host)) {
    throw new PingError(`目标格式非法：${host}（应为 IPv4 地址或 DNS 主机名，不能含空格）`)
  }
  return host
}

/** 发包数：1-10000 */
export function validateCount(raw: string): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 10000) {
    throw new PingError(`发包数非法：${raw}（须为 1-10000 的整数）`)
  }
  return n
}

/** 间隔秒：0.1-60 */
export function validateInterval(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0.1 || n > 60) {
    throw new PingError(`间隔非法：${raw}（须为 0.1-60 秒）`)
  }
  return n
}

/** 包字节数：0-65500 */
export function validatePacketSize(raw: string): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 65500) {
    throw new PingError(`包大小非法：${raw}（须为 0-65500 的整数字节）`)
  }
  return n
}

/** 按平台拼 ping 命令 */
export function buildPingCommand(
  host: string,
  count: number,
  interval: number,
  size: number,
  platform: string,
): string {
  if (platform === 'windows') {
    // Windows ping：-n 次数、-l 大小；没有间隔参数（固定约 1 秒）
    return `ping -n ${count} -l ${size} ${host}`
  }
  if (platform === 'linux' || platform === 'macos') {
    // Linux/macOS ping：-c 次数、-i 间隔、-s 大小
    return `ping -c ${count} -i ${interval} -s ${size} ${host}`
  }
  throw new PingError('不支持的平台：' + platform)
}

/** tcping：基于 TCP 连接的「ping」，过 ICMP 限速/禁 ping 场景常用，默认 80 端口 */
export function buildTcpingCommand(host: string): string {
  return `tcping ${host} 80`
}

/** 参数解释 */
export const PARAM_NOTES: ReadonlyArray<readonly [string, string]> = [
  ['-n / -c', '发包个数：Windows 用 -n，Linux/macOS 用 -c'],
  ['-i', '发包间隔秒数（仅 Linux/macOS；Windows ping 固定约 1 秒，无此参数）'],
  ['-l / -s', '每个探测包的字节大小：Windows 用 -l，Linux/macOS 用 -s'],
  ['tcping', '不依赖 ICMP：直接 TCP 连目标 80 端口，目标禁 ping 时用它判断连通性'],
]

/** 平台合法性自检 */
export function assertOptions(options: PingOptions): void {
  if (!(PLATFORMS as readonly string[]).includes(options.platform)) {
    throw new PingError('不支持的平台：' + options.platform)
  }
}

/**
 * HTTP 层可达性弱检测：fetch(no-cors) 不透明响应，只能证明「TCP/TLS 握手完成、服务器有响应」，
 * 与 ICMP Echo Reply 完全不是一回事。8 秒超时。
 */
export async function httpReachability(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  const t0 = performance.now()
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
    const ms = Math.round(performance.now() - t0)
    return `HTTP 层可达：服务器在约 ${ms} ms 内完成了响应（no-cors 响应不透明，无法读状态码；这不是 ICMP ping）`
  } catch (err) {
    const ms = Math.round(performance.now() - t0)
    const name = err instanceof Error ? err.name : String(err)
    return `HTTP 层不可达：${name}（约 ${ms} ms）—— 可能是 DNS 失败、网络不通或被浏览器拦截`
  } finally {
    clearTimeout(timer)
  }
}

/** 拼装命令段（纯函数，便于单测） */
export function buildCommandSection(
  host: string,
  count: number,
  interval: number,
  size: number,
  platform: string,
): string {
  const lines: string[] = []
  lines.push('## ping 命令（复制到终端执行；浏览器无法发送 ICMP）')
  lines.push('```text')
  lines.push(buildPingCommand(host, count, interval, size, platform))
  lines.push('```')
  lines.push('')
  lines.push('## tcping（ICMP 被禁时的 TCP 层连通性）')
  lines.push('```text')
  lines.push(buildTcpingCommand(host))
  lines.push('```')
  lines.push('')
  lines.push('## 参数说明')
  for (const [flag, desc] of PARAM_NOTES) {
    lines.push(`- ${flag}：${desc}`)
  }
  return lines.join('\n')
}

/** 主入口：空输入返回空串；非法格式抛中文错误；可选做一次 HTTP 弱检测 */
export async function transform(input: PingInput, options: PingOptions): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new PingError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  assertOptions(options)
  const host = validateHost(input.text)
  const count = validateCount(options.count)
  const interval = validateInterval(options.interval)
  const size = validatePacketSize(options.packetSize)

  const lines = [
    '# 浏览器无法发送真实 ICMP Echo Request —— 以下为可复制到终端执行的 ping 命令',
    '',
    buildCommandSection(host, count, interval, size, options.platform),
  ]

  if (options.httpCheck) {
    const url = 'https://' + host
    lines.push('')
    lines.push('## HTTP 可达性弱检测（注意：这不是 ICMP ping）')
    lines.push(`正在对 ${url} 发起一次 no-cors 请求…`)
    lines.push(await httpReachability(url))
  }

  return lines.join('\n')
}
