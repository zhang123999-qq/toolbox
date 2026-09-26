import type { HtaccessOptions } from './schema'

export function transform(input: { text: string }, options: HtaccessOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const lines: string[] = []

  // 重定向：每行 "旧路径 新URL"
  const redirectLines = options.redirects
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (redirectsSection(redirectLines, lines)) {
    lines.push('')
  }

  if (options.rewrites) {
    lines.push(
      '# URL 重写',
      'RewriteEngine On',
      'RewriteCond %{REQUEST_FILENAME} !-f',
      'RewriteCond %{REQUEST_FILENAME} !-d',
      'RewriteRule ^(.*)$ index.php [QSA,L]',
      '',
    )
  }
  if (options.cache) {
    lines.push(
      '# 浏览器缓存',
      '<IfModule mod_expires.c>',
      '  ExpiresActive On',
      '  ExpiresByType text/css "access plus 1 month"',
      '  ExpiresByType application/javascript "access plus 1 month"',
      '  ExpiresByType image/png "access plus 1 year"',
      '</IfModule>',
      '',
    )
  }
  if (options.hotlink) {
    lines.push(
      '# 防盗链',
      'RewriteEngine On',
      'RewriteCond %{HTTP_REFERER} !^$',
      'RewriteCond %{HTTP_REFERER} !^https?://(www\\.)?example\\.com/ [NC]',
      'RewriteRule \\.(jpg|png|gif)$ - [F]',
      '',
    )
  }
  if (options.deny) {
    lines.push(
      '# 禁止访问隐藏文件',
      '<FilesMatch "^\\.">',
      '  Require all denied',
      '</FilesMatch>',
      '',
    )
  }

  if (lines.length === 0) throw new Error('请至少填写重定向或勾选一个选项')

  return lines.join('\n').trimEnd() + '\n'
}

function redirectsSection(redirectLines: readonly string[], lines: string[]): boolean {
  if (redirectLines.length === 0) return false
  lines.push('# 重定向')
  for (const r of redirectLines) {
    const [from, to] = r.split(/\s+/)
    if (!from || !to) throw new Error('重定向每行格式应为：旧路径 新URL')
    lines.push(`Redirect 301 ${from} ${to}`)
  }
  return true
}
