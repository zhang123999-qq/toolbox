import type { NginxConfigOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

/** 拒绝任何可换行/注入新指令或破坏语法的字符 */
function singleLine(raw: string, field: string, allow: RegExp): string {
  const v = raw.trim()
  if (hasControlChar(v)) throw new Error(`${field}不能包含换行或控制字符`)
  if (!allow.test(v)) throw new Error(`${field}包含非法字符：${v}`)
  return v
}

function validateServerName(raw: string): string {
  // 域名：字母数字 . - * ，可多个（空格分隔）
  return singleLine(raw, '域名（server_name）', /^[A-Za-z0-9_.\- *]+$/)
}

function validateListen(raw: string, ssl: boolean): string {
  const v = raw.trim()
  // 形如 80 / 443 ssl / 8080 default_server
  if (!/^\d{1,5}(?: (?:ssl|default_server))*$/.test(v)) {
    throw new Error('监听端口（listen）格式非法，示例：80 或 443 ssl')
  }
  const port = Number(v.match(/\d{1,5}/)?.[0] ?? '0')
  if (port < 1 || port > 65535) throw new Error('监听端口必须在 1-65535 之间')
  if (ssl && !/\bssl\b/.test(v)) return v + ' ssl'
  return v
}

function validateRoot(raw: string): string {
  // 绝对路径：允许常见路径字符（含空格则自动加引号），禁止 ; { } 换行 引号
  const v = raw.trim()
  if (hasControlChar(v) || /[;{}"']/.test(v)) throw new Error('站点根目录（root）包含非法字符')
  if (!/^\//.test(v)) throw new Error('站点根目录（root）需为绝对路径，如 /usr/share/nginx/html')
  return /\s/.test(v) ? `"${v}"` : v
}

function validateProxy(raw: string): string {
  const v = raw.trim()
  if (hasControlChar(v) || /[;{}"']/.test(v)) throw new Error('反代地址（proxy_pass）包含非法字符')
  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(v)) {
    throw new Error('反代地址（proxy_pass）需为合法 URL，如 http://127.0.0.1:3000')
  }
  return v
}

export function transform(input: { text: string }, options: NginxConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const serverName =
    options.serverName.trim() === '' ? 'example.com' : validateServerName(options.serverName)
  const listen =
    options.listen.trim() === ''
      ? options.ssl
        ? '443 ssl'
        : '80'
      : validateListen(options.listen, options.ssl)
  const root = options.root.trim() === '' ? '/usr/share/nginx/html' : validateRoot(options.root)
  const proxy = options.proxyPass.trim() === '' ? '' : validateProxy(options.proxyPass)

  const lines: string[] = ['server {', `    listen ${listen};`, `    server_name ${serverName};`]

  if (options.ssl) {
    lines.push('    ssl_certificate     /etc/nginx/ssl/server.crt;')
    lines.push('    ssl_certificate_key /etc/nginx/ssl/server.key;')
  }

  if (proxy) {
    lines.push(
      '',
      '    location / {',
      `        proxy_pass ${proxy};`,
      '        proxy_set_header Host $host;',
      '        proxy_set_header X-Real-IP $remote_addr;',
      '    }',
    )
  } else {
    lines.push('', `    root ${root};`, '    index index.html;')
  }

  if (options.gzip) {
    lines.push(
      '',
      '    gzip on;',
      '    gzip_types text/plain text/css application/json application/javascript;',
    )
  }

  lines.push('}')
  return lines.join('\n') + '\n'
}
