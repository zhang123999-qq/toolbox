import type { SshConfigInput, SshConfigOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

const MAX_INPUT = 200_000

/** 拒绝换行等控制字符（防止注入下一条 ssh_config 指令） */
function noControl(raw: string, field: string): string {
  const v = raw.trim()
  if (hasControlChar(v)) throw new Error(`${field}不能包含换行或控制字符`)
  return v
}

/** 不含空白的单值（HostName / User / ProxyJump） */
function singleToken(raw: string, field: string, allow: RegExp): string {
  const v = noControl(raw, field)
  if (v !== '' && !allow.test(v)) throw new Error(`${field}包含非法字符：${v}`)
  return v
}

/** 校验主机别名：ssh_config 里 Host 是必填项，且不能含空白 */
export function assertOptions(options: SshConfigOptions): void {
  if (options.host.trim() === '') {
    throw new Error('请填写主机别名（Host），例如 myserver')
  }
  if (/\s/.test(options.host.trim())) {
    throw new Error('主机别名（Host）不能包含空白字符')
  }
  if (hasControlChar(options.host.trim())) {
    throw new Error('主机别名（Host）不能包含换行')
  }
  const port = options.port.trim()
  if (port !== '') {
    if (!/^\d{1,5}$/.test(port)) throw new Error('端口（Port）必须是数字')
    const n = Number(port)
    if (n < 1 || n > 65535) throw new Error('端口（Port）必须在 1-65535 之间')
  }
  singleToken(options.hostname, '主机地址（HostName）', /^[A-Za-z0-9._-]+$/)
  singleToken(options.user, '用户名（User）', /^[A-Za-z0-9._-]+$/)
  singleToken(options.proxyJump, '跳板机（ProxyJump）', /^[A-Za-z0-9._,@:%-]+$/)
  const id = noControl(options.identityFile, '密钥路径（IdentityFile）')
  if (id !== '' && /["']/.test(id)) throw new Error('密钥路径（IdentityFile）不能包含引号')
}

/** 拼出 ssh_config 片段：每条指令一行，空字段跳过 */
export function buildConfig(options: SshConfigOptions): string {
  const lines: string[] = []
  lines.push(`Host ${options.host.trim()}`)
  const hostname = options.hostname.trim()
  const user = options.user.trim()
  const port = options.port.trim()
  const identityFile = options.identityFile.trim()
  const proxyJump = options.proxyJump.trim()
  if (hostname !== '') lines.push(`  HostName ${hostname}`)
  if (user !== '') lines.push(`  User ${user}`)
  if (port !== '') lines.push(`  Port ${port}`)
  if (identityFile !== '')
    lines.push(`  IdentityFile ${/\s/.test(identityFile) ? `"${identityFile}"` : identityFile}`)
  if (proxyJump !== '') lines.push(`  ProxyJump ${proxyJump}`)
  if (options.forwardAgent) lines.push('  ForwardAgent yes')
  return lines.join('\n')
}

export function transform(input: SshConfigInput, options: SshConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT)
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  assertOptions(options)
  return [
    '# 追加到 ~/.ssh/config（Linux/macOS）或 %USERPROFILE%\\.ssh\\config（Windows）',
    buildConfig(options),
  ].join('\n')
}
