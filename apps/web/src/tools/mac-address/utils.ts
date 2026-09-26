import type { MacInput, MacOptions } from './schema'

/** 内置常见 OUI 表（前 3 字节 → 厂商） */
const OUI: ReadonlyArray<readonly [string, string]> = [
  ['00:00:0C', 'Cisco'],
  ['00:0C:29', 'VMware'],
  ['00:50:56', 'VMware'],
  ['08:00:27', 'VirtualBox'],
  ['52:54:00', 'QEMU / KVM'],
  ['00:16:3E', 'Xen'],
  ['00:1C:42', 'Parallels'],
  ['B8:27:EB', 'Raspberry Pi'],
  ['DC:A6:32', 'Raspberry Pi'],
  ['E4:5F:01', 'Raspberry Pi'],
  ['3C:5A:B4', 'Microsoft'],
  ['F0:D4:15', 'Dell'],
  ['00:1A:11', 'Google'],
  ['00:1B:44', 'Amazon'],
  ['00:25:90', 'Supermicro'],
  ['00:0D:B9', 'IBM'],
  ['00:14:22', 'Intel'],
  ['3C:D9:2B', 'Intel'],
  ['00:1C:C0', 'Intel'],
  ['00:23:14', 'D-Link'],
  ['00:13:46', 'Netgear'],
  ['00:1A:70', 'Netgear'],
  ['00:E0:4C', 'Realtek'],
  ['52:54:00', 'QEMU / KVM'],
  ['00:16:CB', 'Dell'],
  ['00:90:7F', 'Jetway'],
  ['00:D0:B7', 'Oracle'],
  ['08:00:30', 'Cronyx'],
  ['00:08:74', 'Pico'],
  ['00:09:3D', 'Pico'],
  ['AC:DE:48', 'AI Generated (随机常见前缀)'],
]

/**
 * 把各种写法的 MAC 归一为 12 位大写 hex（无分隔符）。
 * 接受 AA:BB:CC:DD:EE:FF、AA-BB-CC-DD-EE-FF、AABB.CCDD.EEFF、AABBCCDDEEFF。
 */
export function normalizeMac(raw: string): string {
  const s = raw.trim().replace(/[:.-]/g, '').toUpperCase()
  if (!/^[0-9A-F]{12}$/.test(s)) {
    throw new Error('MAC 地址须为 12 位十六进制：' + raw)
  }
  return s
}

/** 转成 AA:BB:CC:DD:EE:FF 标准形式 */
export function formatMac(s: string): string {
  return s.match(/.{2}/g)!.join(':')
}

/** 查 OUI 厂商；未收录返回空串。入参为 12 位紧凑 hex */
export function lookupVendor(six: string): string {
  const oui = `${six.slice(0, 2)}:${six.slice(2, 4)}:${six.slice(4, 6)}`.toUpperCase()
  for (const [prefix, vendor] of OUI) {
    if (prefix.toUpperCase() === oui) return vendor
  }
  return ''
}

/** 生成随机 MAC（本地管理位置 1，避免跟真实网卡冲突） */
export function randomMac(): string {
  const bytes = new Uint8Array(6)
  for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[0] = (bytes[0] & 0xfc) | 0x02
  return [...bytes].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('')
}

/** T2 同步入口 */
export function transform(input: MacInput, options: MacOptions): string {
  if (options.mode === 'generate') {
    if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
    const mac = randomMac()
    return [
      `随机 MAC：${formatMac(mac)}`,
      `紧凑形式：${mac}`,
      `OUI（前 3 字节）：${formatMac(mac.slice(0, 6))}`,
    ].join('\n')
  }

  const raw = input.text.trim()
  if (raw === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const mac = normalizeMac(raw)
  const vendor = lookupVendor(mac)
  return [
    `标准形式：${formatMac(mac)}`,
    `紧凑形式：${mac}`,
    `OUI：${formatMac(mac.slice(0, 6))}`,
    `厂商：${vendor === '' ? '未收录（查询 IEEE OUI 注册表确认）' : vendor}`,
  ].join('\n')
}
