import type { LbConfigInput, LbConfigOptions } from './schema'

const MAX_INPUT = 200_000

/** 解析后端列表：每行 host:port，校验格式 */
export function parseServers(raw: string): string[] {
  const list = raw
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (list.length === 0) throw new Error('后端服务器列表不能为空：每行一个 host:port')
  for (const item of list) {
    if (!/^[a-zA-Z0-9._-]+:\d+$/.test(item)) {
      throw new Error(`后端地址格式非法：${item}（应为 host:port，如 10.0.0.1:8080）`)
    }
  }
  return list
}

export function buildNginx(options: LbConfigOptions, servers: string[]): string {
  const algoLine =
    options.algorithm === 'least_conn'
      ? '    least_conn;\n'
      : options.algorithm === 'ip_hash'
        ? '    ip_hash;\n'
        : ''
  const health = options.healthCheck ? '    health_check;\n' : ''
  const serverLines = servers.map((s) => `    server ${s};`).join('\n')
  return [
    'upstream backend {',
    algoLine.trim(),
    serverLines,
    health.trim(),
    '}',
    '',
    'server {',
    '    listen 80;',
    '    location / {',
    '        proxy_pass http://backend;',
    '    }',
    '}',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

export function buildHaproxy(options: LbConfigOptions, servers: string[]): string {
  const balance =
    options.algorithm === 'least_conn'
      ? '    balance leastconn'
      : options.algorithm === 'ip_hash'
        ? '    balance source'
        : '    balance roundrobin'
  const health = options.healthCheck ? '    option httpchk\n' : ''
  const serverLines = servers.map((s, i) => `    server s${i + 1} ${s} check`).join('\n')
  return ['backend backend', balance, health.trim(), serverLines].filter((l) => l !== '').join('\n')
}

export function transform(input: LbConfigInput, options: LbConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  const servers = parseServers(options.servers)
  if (options.type === 'nginx') return buildNginx(options, servers)
  return buildHaproxy(options, servers)
}
