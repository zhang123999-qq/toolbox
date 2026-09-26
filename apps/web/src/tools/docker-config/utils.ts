import type { DockerConfigOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

const DEFAULT_VERSION: Readonly<Record<string, string>> = {
  node: '20-alpine',
  python: '3.12-slim',
  golang: '1.22-alpine',
  openjdk: '21-jre',
}

const DEFAULT_CMD: Readonly<Record<string, string>> = {
  node: 'node server.js',
  python: 'python app.py',
  golang: './app',
  openjdk: 'java -jar /app/app.jar',
}

/** 镜像 tag：字母数字 . _ -，防止换行/空格注入后续 Dockerfile 指令 */
function validateTag(raw: string): string {
  const tag = raw.trim()
  if (!/^[A-Za-z0-9_.-]+$/.test(tag)) throw new Error(`镜像版本（tag）包含非法字符：${tag}`)
  return tag
}

/** WORKDIR：绝对路径，禁止换行/控制字符；含空格时加引号 */
function validateWorkdir(raw: string): string {
  const dir = raw.trim()
  if (hasControlChar(dir) || /["']/.test(dir))
    throw new Error('工作目录（WORKDIR）不能包含换行或引号')
  if (!/^\//.test(dir)) throw new Error('工作目录（WORKDIR）需为绝对路径，如 /app')
  return /\s/.test(dir) ? `"${dir}"` : dir
}

/** EXPOSE 端口：1-65535 整数 */
function validatePort(raw: string): string {
  const p = raw.trim()
  if (!/^\d{1,5}$/.test(p)) throw new Error('暴露端口（EXPOSE）必须是数字')
  const n = Number(p)
  if (n < 1 || n > 65535) throw new Error('暴露端口必须在 1-65535 之间')
  return p
}

/** CMD：允许常规 shell 字符与空格，但禁止换行/控制字符（否则会注入新指令） */
function validateCommand(raw: string): string {
  const cmd = raw.trim()
  if (hasControlChar(cmd)) throw new Error('启动命令（CMD）不能包含换行或控制字符')
  return cmd
}

export function transform(input: { text: string }, options: DockerConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const version =
    options.version.trim() === ''
      ? (DEFAULT_VERSION[options.baseImage] ?? 'latest')
      : validateTag(options.version)
  const image = `${options.baseImage}:${version}`
  const workdir = options.workdir.trim() === '' ? '/app' : validateWorkdir(options.workdir)
  const port = options.port.trim() === '' ? '3000' : validatePort(options.port)
  const cmd =
    options.command.trim() === ''
      ? (DEFAULT_CMD[options.baseImage] ?? 'echo "override CMD"')
      : validateCommand(options.command)

  const lines = [
    `FROM ${image}`,
    '',
    `WORKDIR ${workdir}`,
    '',
    'COPY . .',
    '',
    `EXPOSE ${port}`,
    '',
    `CMD ${cmd}`,
    '',
  ]
  return lines.join('\n')
}
