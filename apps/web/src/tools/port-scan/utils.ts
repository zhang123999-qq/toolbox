import type { PortScanInput, PortScanOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示为 role=alert */
export class PortScanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PortScanError'
  }
}

export const MAX_INPUT = 200_000

export const SCAN_TYPES = ['connect', 'syn', 'udp'] as const
export const SPEEDS = ['slow', 'normal', 'fast'] as const

/** nmap 时序模板：慢=-T2，正常=-T3（默认，省略），快=-T4 */
export function speedFlag(speed: string): string {
  if (speed === 'slow') return '-T2'
  if (speed === 'fast') return '-T4'
  if (speed === 'normal') return ''
  throw new PortScanError('不支持的扫描速度：' + speed)
}

/** nmap 扫描类型标志：connect=-sT，syn=-sS，udp=-sU */
export function scanTypeFlag(scanType: string): string {
  if (scanType === 'connect') return '-sT'
  if (scanType === 'syn') return '-sS'
  if (scanType === 'udp') return '-sU'
  throw new PortScanError('不支持的扫描类型：' + scanType)
}

/**
 * 校验目标主机：接受 IPv4（每段 0-255）或 DNS 主机名（标签为字母/数字/连字符）。
 * 返回去掉首尾空白后的主机名。
 */
export function validateHost(raw: string): string {
  const host = raw.trim()
  if (host === '') {
    throw new PortScanError('请输入目标主机或 IP（如 192.168.1.1 或 example.com）')
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const m = host.match(ipv4)
  if (m) {
    for (const octet of m.slice(1)) {
      if (Number(octet) > 255) {
        throw new PortScanError(`IPv4 地址段非法：${octet}（每段须在 0-255 之间）`)
      }
    }
    return host
  }
  const hostname =
    /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
  if (!hostname.test(host)) {
    throw new PortScanError(`目标格式非法：${host}（应为 IPv4 地址或 DNS 主机名，不能含空格）`)
  }
  return host
}

export interface PortSpec {
  /** 规范化后的 nmap -p 实参（原样回显用户写法，已校验） */
  readonly nmap: string
  /** bash/zsh for 循环里的端口迭代表达式：`22 80 443` 或 `$(seq 22 25)` */
  readonly shell: string
  /** PowerShell 数组字面量：`22,80,443` 或 `22..25` */
  readonly ps: string
}

/**
 * 校验端口范围写法。接受逗号分隔的「单端口」或「a-b 区间」，端口须在 1-65535。
 * 返回三种宿主各自友好的迭代写法。
 */
export function parsePorts(raw: string): PortSpec {
  const spec = raw.trim()
  if (spec === '') {
    throw new PortScanError('请输入端口范围（如 1-1000 或 22,80,443）')
  }
  const parts = spec
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    throw new PortScanError('端口范围为空')
  }
  const singles: number[] = []
  const ranges: [number, number][] = []
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d{1,5})-(\d{1,5})$/)
    const single = part.match(/^(\d{1,5})$/)
    if (rangeMatch) {
      const a = Number(rangeMatch[1])
      const b = Number(rangeMatch[2])
      if (a < 1 || b > 65535 || a > b) {
        throw new PortScanError(`端口区间非法：${part}（端口须在 1-65535，且起点不大于终点）`)
      }
      ranges.push([a, b])
    } else if (single) {
      const p = Number(single[1])
      if (p < 1 || p > 65535) {
        throw new PortScanError(`端口非法：${p}（须在 1-65535 之间）`)
      }
      singles.push(p)
    } else {
      throw new PortScanError(`端口段格式非法：${part}（应为 80 或 80-90）`)
    }
  }
  // nmap -p 实参：用规范化后的逗号串回显，避免用户在逗号后留空格导致 shell 把
  // `22, 80-90` 拆成两个参数（22, 与 80-90）。
  // shell / PS：每个区间用 seq / 区间运算符运行时展开，离散端口直接列出——
  // 不内联枚举区间（区间可能上万端口），也不丢弃任何一段。
  return {
    nmap: parts.join(','),
    shell: [...ranges.map(([a, b]) => `$(seq ${a} ${b})`), ...singles.map(String)].join(' '),
    ps: [...ranges.map(([a, b]) => `${a}..${b}`), ...singles.map(String)].join(','),
  }
}

/** 端口状态说明（nmap 语义） */
export const PORT_STATES: ReadonlyArray<readonly [string, string]> = [
  ['open', '有应用正在监听并接受连接 —— 目标端口对外开放'],
  ['closed', '主机可达但该端口无应用监听（收到 RST）—— 可用于判断主机存活'],
  ['filtered', '防火墙 / ACL 丢弃了探测包，无法判断是否真的开放 —— 换 -sS 或加 --reason 复核'],
]

/** 常见端口服务速查 */
export const COMMON_PORTS: ReadonlyArray<readonly [number, string]> = [
  [21, 'FTP 数据传输'],
  [22, 'SSH 远程登录'],
  [25, 'SMTP 发信'],
  [53, 'DNS 域名解析'],
  [80, 'HTTP 网页'],
  [443, 'HTTPS 加密网页'],
  [3306, 'MySQL'],
  [5432, 'PostgreSQL'],
  [6379, 'Redis'],
  [8080, 'HTTP 备用 / 代理'],
  [27017, 'MongoDB'],
]

/** 拼 nmap 命令 */
export function buildNmap(host: string, ports: PortSpec, options: PortScanOptions): string {
  const parts = ['nmap']
  parts.push(scanTypeFlag(options.scanType))
  const t = speedFlag(options.speed)
  if (t) parts.push(t)
  parts.push('-p', ports.nmap)
  parts.push('-sV')
  parts.push(host)
  return parts.join(' ')
}

/** 拼 nc（netcat）命令 */
export function buildNc(host: string, ports: PortSpec): string {
  return `for p in ${ports.shell}; do nc -zv -w 2 ${host} $p; done`
}

/** 拼 PowerShell Test-NetConnection 命令 */
export function buildPowerShell(host: string, ports: PortSpec): string {
  return [
    `$target = '${host}'`,
    `$ports  = ${ports.ps}`,
    'foreach ($p in $ports) {',
    '  $r = Test-NetConnection -ComputerName $target -Port $p -WarningAction SilentlyContinue',
    '  if ($r.TcpTestSucceeded) { "OPEN    ${target}:$p" } else { "CLOSED  ${target}:$p" }',
    '}',
  ].join('\n')
}

/** 拼 bash /dev/tcp 命令 */
export function buildBashTcp(host: string, ports: PortSpec): string {
  return [
    `host=${host}`,
    `for p in ${ports.shell}; do`,
    '  (echo > /dev/tcp/$host/$p) 2>/dev/null && echo "OPEN   $host:$p" || echo "CLOSED $host:$p"',
    'done',
  ].join('\n')
}

/** 选项合法性自检 */
export function assertOptions(options: PortScanOptions): void {
  scanTypeFlag(options.scanType)
  speedFlag(options.speed)
}

/**
 * 主入口：空输入返回空串；超长 / 非法格式抛中文错误（由 UI 渲染为 role=alert）。
 * 纯字符串拼接，不发起任何网络请求。
 */
export function transform(input: PortScanInput, options: PortScanOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new PortScanError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  assertOptions(options)
  const host = validateHost(input.text)
  const ports = parsePorts(options.ports)

  const lines: string[] = []
  lines.push('# 浏览器无法发起真实 TCP/UDP 扫描 —— 以下为可复制到本机终端执行的命令')
  lines.push('# 请在你自己的机器上运行（nmap 部分类型需要 root/sudo），本页面不做任何网络探测。')
  lines.push('')
  lines.push('## nmap（功能最全，推荐）')
  lines.push('```bash')
  lines.push(buildNmap(host, ports, options))
  lines.push('```')
  lines.push('')
  lines.push('## nc / netcat（逐个端口，无需安装 nmap）')
  lines.push('```bash')
  lines.push(buildNc(host, ports))
  lines.push('```')
  lines.push('')
  lines.push('## PowerShell（Windows 自带）')
  lines.push('```powershell')
  lines.push(buildPowerShell(host, ports))
  lines.push('```')
  lines.push('')
  lines.push('## bash /dev/tcp（无 nc 时的纯 bash 写法）')
  lines.push('```bash')
  lines.push(buildBashTcp(host, ports))
  lines.push('```')
  lines.push('')
  lines.push('## 端口状态含义')
  for (const [state, desc] of PORT_STATES) {
    lines.push(`- ${state}：${desc}`)
  }
  lines.push('')
  lines.push('## 常见端口速查')
  for (const [port, svc] of COMMON_PORTS) {
    lines.push(`- ${port}/tcp：${svc}`)
  }
  return lines.join('\n')
}
