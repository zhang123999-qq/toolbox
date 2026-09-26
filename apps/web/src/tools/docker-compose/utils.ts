import type { DockerComposeOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

/** 按换行 / 逗号切分，去空白与空项 */
function splitList(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Compose 服务名：字母数字开头，仅含字母数字、_ . -，长度 1-63 */
function validateService(raw: string, field: string): string {
  const name = raw.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/.test(name)) {
    throw new Error(`${field}只能包含字母、数字、“_”“.”“-”且以字母或数字开头`)
  }
  return name
}

/** 镜像引用：禁止空白/控制字符，仅允许常规镜像字符 */
function validateImage(raw: string): string {
  const image = raw.trim()
  if (/\s/.test(image) || hasControlChar(image)) {
    throw new Error('镜像地址不能包含空白或换行')
  }
  if (!/^[A-Za-z0-9._/@:+-]+$/.test(image)) throw new Error('镜像地址包含非法字符')
  return image
}

/** 端口段：80 / 8080:80 / 127.0.0.1:8080:80，可带 /tcp|/udp；逐段校验 1-65535 */
function validatePort(raw: string): string {
  const item = raw.trim()
  const m = item.match(/^(\d{1,3}(?:\.\d{1,3}){3})?:?(\d{1,5})(?::(\d{1,5}))?(\/(?:tcp|udp))?$/)
  if (!m) throw new Error(`端口格式不合法：${item}（示例 8080:80 或 80）`)
  for (const seg of [m[2], m[3]]) {
    if (seg !== undefined) {
      const n = Number(seg)
      if (n < 1 || n > 65535) throw new Error(`端口号必须在 1-65535 之间：${seg}`)
    }
  }
  return item
}

/**
 * 环境变量项必须是 KEY=value；KEY 合法。
 * 输出为 YAML map 形式 `KEY: "value"`（双引号会被 YAML 正确解析、可安全转义，
 * 而列表短语法 - KEY=value 中引号会被当成值的一部分）。
 */
function formatEnv(raw: string): string {
  const item = raw.trim()
  const eq = item.indexOf('=')
  if (eq <= 0) throw new Error(`环境变量需为 KEY=value 格式：${item}`)
  const key = item.slice(0, eq)
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`环境变量名不合法：${key}`)
  }
  const value = item.slice(eq + 1)
  return `      ${key}: ${JSON.stringify(value)}`
}

/** 数据卷：source:target[:ro|rw]，禁止引号/控制字符；整体引号包裹 */
function formatVolume(raw: string): string {
  const item = raw.trim()
  if (hasControlChar(item) || /["']/.test(item)) throw new Error(`挂载路径包含非法字符：${item}`)
  const parts = item.split(':')
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`数据卷需为 源路径:容器路径[:ro|rw] 格式：${item}`)
  }
  if (parts.length === 3 && parts[2] !== 'ro' && parts[2] !== 'rw') {
    throw new Error(`数据卷访问模式只能是 ro 或 rw：${item}`)
  }
  return `- ${JSON.stringify(item)}`
}

export function transform(input: { text: string }, options: DockerComposeOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const service =
    options.serviceName.trim() === '' ? 'app' : validateService(options.serviceName, '服务名')
  const image = options.image.trim() === '' ? 'nginx:alpine' : validateImage(options.image)
  const ports = splitList(options.ports).map(validatePort)
  const env = splitList(options.environment).map(formatEnv)
  const volumes = splitList(options.volumes).map(formatVolume)
  const deps = splitList(options.dependsOn).map((d) => validateService(d, '依赖服务名'))

  const lines: string[] = ['services:', `  ${service}:`, `    image: ${image}`]
  if (ports.length) {
    lines.push('    ports:')
    for (const p of ports) lines.push(`      - "${p}"`)
  }
  if (env.length) {
    lines.push('    environment:')
    for (const e of env) lines.push(e)
  }
  if (volumes.length) {
    lines.push('    volumes:')
    for (const v of volumes) lines.push('      ' + v)
  }
  if (deps.length) {
    lines.push('    depends_on:')
    for (const d of deps) lines.push(`      - ${d}`)
  }
  return lines.join('\n') + '\n'
}
