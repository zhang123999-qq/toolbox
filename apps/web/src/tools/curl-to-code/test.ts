import { describe, expect, it } from 'vitest'
import type { CurlToCodeOptions } from './schema'
import {
  genFetch,
  genGo,
  genJava,
  genNode,
  genPython,
  parseCurl,
  tokenize,
  transform,
} from './utils'

const LANG: CurlToCodeOptions = { language: 'fetch' }

describe('curl-to-code / tokenize', () => {
  it('按空白切分，保留引号内内容', () => {
    expect(tokenize('curl https://a.com -H "Content-Type: application/json"')).toEqual([
      'curl',
      'https://a.com',
      '-H',
      'Content-Type: application/json',
    ])
  })

  it('单引号与反斜杠续行', () => {
    const out = tokenize("curl 'https://a.com' \\\n  -d 'a=b'")
    expect(out).toContain('https://a.com')
    expect(out).toContain('a=b')
  })

  it('双引号内转义', () => {
    expect(tokenize('curl "a\\"b"')).toEqual(['curl', 'a"b'])
  })
})

describe('curl-to-code / parseCurl', () => {
  it('裸 URL + 默认 GET', () => {
    const req = parseCurl('curl https://example.com')
    expect(req.url).toBe('https://example.com')
    expect(req.method).toBe('GET')
  })

  it('-d 自动推断 POST', () => {
    const req = parseCurl("curl https://a.com/api -d 'x=1'")
    expect(req.method).toBe('POST')
    expect(req.body).toBe('x=1')
  })

  it('-X 显式方法优先', () => {
    const req = parseCurl("curl -X PUT https://a.com -d '{}'")
    expect(req.method).toBe('PUT')
  })

  it('多个 -H 解析为键值对', () => {
    const req = parseCurl('curl https://a.com -H "Content-Type: application/json" -H "X-A: 1"')
    expect(req.headers).toEqual([
      ['Content-Type', 'application/json'],
      ['X-A', '1'],
    ])
  })

  it('--url 与位置参数都能识别', () => {
    expect(parseCurl('curl --url https://a.com').url).toBe('https://a.com')
  })

  it('-u 生成 Basic Authorization 头', () => {
    const req = parseCurl('curl -u admin:secret https://a.com')
    const auth = req.headers.find(([k]) => k === 'Authorization')
    expect(auth?.[1]).toBe('Basic ' + btoa('admin:secret'))
  })
})

describe('curl-to-code / parseCurl 错误', () => {
  it('空命令报错', () => {
    expect(() => parseCurl('   ')).toThrow(/空命令/)
  })
  it('不以 curl 开头报错', () => {
    expect(() => parseCurl('wget https://a.com')).toThrow(/以 curl 开头/)
  })
  it('缺 URL 报错', () => {
    expect(() => parseCurl('curl -H "X: 1"')).toThrow(/未找到请求 URL/)
  })
  it('URL 缺协议报错', () => {
    expect(() => parseCurl('curl example.com')).toThrow(/http/)
  })
  it('请求头缺冒号报错', () => {
    expect(() => parseCurl('curl https://a.com -H "no colon"')).toThrow(/Key: Value/)
  })
})

describe('curl-to-code / 代码生成', () => {
  const req = parseCurl(
    'curl -X POST https://api.example.com/u -H "Content-Type: application/json" -d \'{"a":1}\'',
  )

  it('fetch 代码含方法与 body', () => {
    const out = genFetch(req)
    expect(out).toContain("fetch('https://api.example.com/u'")
    expect(out).toContain("method: 'POST'")
    expect(out).toContain('body: `{"a":1}`')
  })

  it('node / python / java / go 都生成', () => {
    expect(genNode(req)).toContain('Node.js 18+')
    expect(genPython(req)).toContain('requests.post')
    expect(genJava(req)).toContain('HttpRequest.newBuilder()')
    expect(genGo(req)).toContain('http.NewRequest')
  })

  it('python 带 JSON body 时导入 json（json.loads 不再 NameError）', () => {
    const out = genPython(req)
    expect(out).toContain('import json')
    expect(out).toContain('json=json.loads')
  })

  it('无 body 的 python 不引入多余 import json', () => {
    const plain = parseCurl('curl https://a.com')
    expect(genPython(plain)).not.toContain('import json')
  })

  it('java 字符串字面量用双引号（单引号在 Java 是 char，无法编译）', () => {
    const out = genJava(req)
    expect(out).toContain('URI.create("https://api.example.com/u")')
    expect(out).toContain('.method("POST",')
    expect(out).not.toContain("URI.create('")
  })

  it('go 字符串字面量用双引号（单引号在 Go 是 rune，无法编译）', () => {
    const out = genGo(req)
    expect(out).toContain('http.NewRequest("POST", "https://api.example.com/u", body)')
    expect(out).not.toContain("http.NewRequest('")
  })
})

describe('curl-to-code / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '   ' }, LANG)).toBe('')
  })
  it('按语言分派', () => {
    const text = 'curl https://example.com'
    expect(transform({ text }, { language: 'python' })).toContain('requests.get')
    expect(transform({ text }, { language: 'go' })).toContain('net/http')
  })
  it('非法语言报错', () => {
    expect(() => transform({ text: 'curl https://a.com' }, { language: 'rust' } as never)).toThrow(
      /不支持的目标语言/,
    )
  })
  it('超长输入报错', () => {
    expect(() => transform({ text: 'curl ' + 'x'.repeat(200000) }, LANG)).toThrow(/上限/)
  })
})
