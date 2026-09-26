import type { CurlToCodeInput, CurlToCodeOptions } from './schema'

const MAX_INPUT = 200_000

export interface ParsedRequest {
  url: string
  method: string
  headers: Array<[string, string]>
  body: string | null
}

/** 把 cURL 命令按 shell 规则切 token：支持单/双引号与反斜杠续行 */
export function tokenize(command: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let hasCurrent = false

  const pushToken = (): void => {
    tokens.push(current)
    current = ''
    hasCurrent = false
  }

  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i]
    if (inSingle) {
      if (ch === "'") inSingle = false
      else current += ch
      continue
    }
    if (inDouble) {
      if (ch === '"') inDouble = false
      else if (ch === '\\' && i + 1 < command.length) {
        const next = command[i + 1]
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          current += next
          i += 1
        } else current += ch
      } else current += ch
      continue
    }
    if (ch === "'") {
      inSingle = true
      hasCurrent = true
      continue
    }
    if (ch === '"') {
      inDouble = true
      hasCurrent = true
      continue
    }
    if (ch === '\\' && i + 1 < command.length) {
      // 续行：\n 直接吞掉；其它转义字符原样保留
      const next = command[i + 1]
      if (next === '\n' || next === '\r') {
        i += 1
        continue
      }
      current += next
      i += 1
      hasCurrent = true
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (hasCurrent) pushToken()
      continue
    }
    current += ch
    hasCurrent = true
  }
  if (hasCurrent) pushToken()
  return tokens
}

/** 这些布尔开关只影响 curl 行为，转代码时直接忽略 */
const NO_VALUE_FLAGS = new Set([
  '-i',
  '-s',
  '-S',
  '-k',
  '-L',
  '--location',
  '--compressed',
  '-v',
  '-#',
  '-o',
  '-O',
  '-G',
  '-N',
  '-f',
  '--fail',
  '-q',
  '-g',
  '--silent',
  '--include',
  '--verbose',
  '--insecure',
  '--http1.1',
  '--http2',
  '-j',
  '-n',
])

/** 这些开关带一个参数，转代码时不需要（仅记录/忽略） */
const IGNORE_VALUE_FLAGS = new Set([
  '-x',
  '--proxy',
  '--max-time',
  '--retry',
  '-o',
  '--output',
  '-b',
  '--cookie',
  '-c',
  '--cookie-jar',
  '-e',
  '--referer',
  '--resolve',
  '-C',
  '--continue-at',
])

/** 解析 token 列表为结构化请求 */
export function parseCurl(command: string): ParsedRequest {
  const tokens = tokenize(command)
  if (tokens.length === 0) throw new Error('空命令：请粘贴一条 cURL 命令')
  if (tokens[0] !== 'curl') {
    throw new Error('命令必须以 curl 开头（当前首 token：' + tokens[0] + '）')
  }

  let url = ''
  let method = ''
  const headers: Array<[string, string]> = []
  let body: string | null = null
  let user: string | null = null

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i]
    const next = (): string => {
      const value = tokens[i + 1]
      if (value === undefined) throw new Error('选项 ' + token + ' 缺少参数')
      i += 1
      return value
    }

    if (token === '--url') {
      url = next()
    } else if (token === '-X' || token === '--request' || token === '--method') {
      method = next().toUpperCase()
    } else if (token === '-H' || token === '--header') {
      const header = next()
      const idx = header.indexOf(':')
      if (idx === -1) throw new Error('请求头格式应为 Key: Value，收到：' + header)
      headers.push([header.slice(0, idx).trim(), header.slice(idx + 1).trim()])
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii' ||
      token === '--data-urlencode'
    ) {
      body = next()
    } else if (token === '-u' || token === '--user') {
      user = next()
    } else if (token === '-A' || token === '--user-agent') {
      headers.push(['User-Agent', next()])
    } else if (NO_VALUE_FLAGS.has(token) || IGNORE_VALUE_FLAGS.has(token)) {
      if (IGNORE_VALUE_FLAGS.has(token)) i += 1
    } else if (token.startsWith('--')) {
      // 未知长选项：带值的就吞掉下一个 token，避免被当成 URL
      i += 1
    } else if (token.startsWith('-') && token.length > 1) {
      // 未知短选项：忽略
    } else {
      // 位置参数：URL
      if (url === '') url = token
      else throw new Error('出现了多余的位置参数：' + token + '（URL 只能有一个）')
    }
  }

  if (url === '') throw new Error('未找到请求 URL：请在命令里给出目标地址')
  if (!/^https?:\/\//i.test(url)) throw new Error('URL 必须以 http:// 或 https:// 开头：' + url)

  if (user) {
    const encoded = btoa(user)
    headers.push(['Authorization', 'Basic ' + encoded])
  }
  if (method === '') method = body !== null ? 'POST' : 'GET'

  return { url, method, headers, body }
}

const q = (s: string): string => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

function quoteJS(s: string): string {
  return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'
}

/** Java / Go 的字符串字面量必须用双引号（单引号是 char / rune），这里做 C 风格转义 */
function qDq(s: string): string {
  return (
    '"' +
    s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') +
    '"'
  )
}

/** 生成浏览器 fetch 代码 */
export function genFetch(req: ParsedRequest): string {
  const lines: string[] = [`const res = await fetch(${q(req.url)}, {`]
  lines.push(`  method: ${q(req.method)},`)
  if (req.headers.length > 0) {
    lines.push('  headers: {')
    for (const [k, v] of req.headers) lines.push(`    ${q(k)}: ${q(v)},`)
    lines.push('  },')
  }
  if (req.body !== null) lines.push(`  body: ${quoteJS(req.body)},`)
  lines.push('})')
  lines.push('')
  lines.push('const text = await res.text()')
  lines.push('console.log(res.status, text)')
  return lines.join('\n')
}

/** 生成 Node.js（内置 fetch，Node 18+）代码 */
export function genNode(req: ParsedRequest): string {
  return ['// Node.js 18+（全局 fetch）', genFetch(req)].join('\n')
}

/** 生成 Python requests 代码 */
export function genPython(req: ParsedRequest): string {
  const usesJsonLoads = req.body !== null && /^\s*[[{]/.test(req.body)
  const lines: string[] = usesJsonLoads
    ? ['import requests', 'import json', '']
    : ['import requests', '']
  const kwargs: string[] = []
  if (req.headers.length > 0) {
    kwargs.push('headers={' + req.headers.map(([k, v]) => `${q(k)}: ${q(v)}`).join(', ') + '}')
  }
  if (req.body !== null) {
    kwargs.push(usesJsonLoads ? `json=json.loads(${q(req.body)})` : `data=${q(req.body)}`)
  }
  lines.push(
    `resp = requests.${req.method.toLowerCase()}(${q(req.url)}${kwargs.length ? ', ' + kwargs.join(', ') : ''})`,
  )
  lines.push('print(resp.status_code)')
  lines.push('print(resp.text)')
  return lines.join('\n')
}

/** 生成 Java 11+ HttpClient 代码 */
export function genJava(req: ParsedRequest): string {
  const lines = [
    'import java.net.URI;',
    'import java.net.http.*;',
    '',
    'public class Request {',
    '  public static void main(String[] args) throws Exception {',
    '    var client = HttpClient.newHttpClient();',
    '    var builder = HttpRequest.newBuilder()',
    `      .uri(URI.create(${qDq(req.url)}))`,
    `      .method(${qDq(req.method)}, ${req.body !== null ? `HttpRequest.BodyPublishers.ofString(${qDq(req.body)})` : 'HttpRequest.BodyPublishers.noBody()'});`,
  ]
  for (const [k, v] of req.headers) lines.push(`    builder.header(${qDq(k)}, ${qDq(v)});`)
  lines.push(
    '    var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());',
  )
  lines.push('    System.out.println(response.statusCode());')
  lines.push('    System.out.println(response.body());')
  lines.push('  }', '}')
  return lines.join('\n')
}

/** 生成 Go net/http 代码 */
export function genGo(req: ParsedRequest): string {
  const lines = [
    'package main',
    '',
    'import (',
    '  "io",',
    '  "net/http",',
    '  "strings",',
    ')',
    '',
    'func main() {',
  ]
  if (req.body !== null) {
    lines.push(`  body := strings.NewReader(${qDq(req.body)})`)
    lines.push(`  req, _ := http.NewRequest(${qDq(req.method)}, ${qDq(req.url)}, body)`)
  } else {
    lines.push(`  req, _ := http.NewRequest(${qDq(req.method)}, ${qDq(req.url)}, nil)`)
  }
  for (const [k, v] of req.headers) lines.push(`  req.Header.Set(${qDq(k)}, ${qDq(v)})`)
  lines.push('  client := &http.Client{}')
  lines.push('  resp, err := client.Do(req)', '  if err != nil { panic(err) }')
  lines.push('  defer resp.Body.Close()', '  b, _ := io.ReadAll(resp.Body)')
  lines.push('  println(resp.StatusCode())', '  println(string(b))')
  lines.push('}')
  return lines.join('\n')
}

export function transform(input: CurlToCodeInput, options: CurlToCodeOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT)
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  const req = parseCurl(input.text)
  switch (options.language) {
    case 'fetch':
      return genFetch(req)
    case 'node':
      return genNode(req)
    case 'python':
      return genPython(req)
    case 'java':
      return genJava(req)
    case 'go':
      return genGo(req)
    default:
      throw new Error('不支持的目标语言：' + options.language)
  }
}
