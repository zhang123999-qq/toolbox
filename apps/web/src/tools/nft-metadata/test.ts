import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RPC_URL,
  IPFS_GATEWAY,
  TOKEN_URI_SELECTOR,
  assertAddress,
  bytesToHex,
  decodeAbiString,
  encodeUint256,
  fetchMetadataJson,
  hexToBytes,
  keccak256,
  parseTokenId,
  renderMetadata,
  resolveTokenUri,
  rpcCall,
  transform,
  type FetchFn,
} from './utils'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response
}

const okFetch: FetchFn = () =>
  Promise.resolve(jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x1' }))

const hangingFetch: FetchFn = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

/** 构造 eth_call 返回的 ABI string 编码 */
function encodeAbiString(s: string): string {
  const bytes = new TextEncoder().encode(s)
  const words: string[] = []
  words.push(32n.toString(16).padStart(64, '0'))
  words.push(BigInt(bytes.length).toString(16).padStart(64, '0'))
  const paddedLen = Math.ceil(bytes.length / 32) * 32
  const padded = new Uint8Array(paddedLen)
  padded.set(bytes)
  words.push(bytesToHex(padded))
  return `0x${words.join('')}`
}

function b64json(obj: unknown): string {
  const text = JSON.stringify(obj)
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

describe('nft-metadata · keccak 与选择器', () => {
  it('tokenURI(uint256) 选择器为知名值', () => {
    expect(TOKEN_URI_SELECTOR).toBe('0xc87b56dd')
  })

  it('keccak256 空串向量', () => {
    expect(bytesToHex(keccak256(new Uint8Array(0)))).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    )
  })
})

describe('nft-metadata · hex 工具', () => {
  it('hexToBytes 正常', () => {
    expect(hexToBytes('0x6162')).toEqual(new Uint8Array([0x61, 0x62]))
    expect(hexToBytes('6162')).toEqual(new Uint8Array([0x61, 0x62]))
  })

  it('hexToBytes 奇数位报错', () => {
    expect(() => hexToBytes('0x123')).toThrow('hex 格式错误')
  })

  it('hexToBytes 非法字符报错', () => {
    expect(() => hexToBytes('0xzz')).toThrow('hex 格式错误')
  })
})

describe('nft-metadata · rpcCall', () => {
  it('成功返回 result', async () => {
    await expect(rpcCall('https://x.test', 'eth_call', [], okFetch)).resolves.toBe('0x1')
  })

  it('空 URL 报错', async () => {
    await expect(rpcCall('', 'm', [], okFetch)).rejects.toThrow('请输入 RPC 地址')
  })

  it('非 http(s) 报错', async () => {
    await expect(rpcCall('ftp://x', 'm', [], okFetch)).rejects.toThrow('http')
  })

  it('超时中文报错', async () => {
    await expect(rpcCall('https://x.test', 'm', [], hangingFetch, 20)).rejects.toThrow('超时')
  })

  it('网络错误中文报错', async () => {
    const f: FetchFn = () => Promise.reject(new Error('down'))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('网络请求失败')
  })

  it('非 Error throw 被包装', async () => {
    const f: FetchFn = () => Promise.reject('nope')
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('nope')
  })

  it('HTTP 错误', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({}, false, 500))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('HTTP 500')
  })

  it('非法 JSON', async () => {
    const f: FetchFn = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('x')),
      } as Response)
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('合法 JSON')
  })

  it('非对象响应', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse(null))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('格式异常')
  })

  it('RPC error 带 code', async () => {
    const f: FetchFn = () =>
      Promise.resolve(jsonResponse({ error: { code: 3, message: 'revert' } }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('revert')
  })

  it('RPC error 空对象', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ error: {} }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('未知错误')
  })

  it('RPC error 为 null 视为成功', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ result: '0x3', error: null }))
    await expect(rpcCall('https://x.test', 'm', [], f)).resolves.toBe('0x3')
  })
})

describe('nft-metadata · assertAddress / parseTokenId / encodeUint256', () => {
  it('合法地址通过', () => {
    expect(assertAddress('0xBC4CA0EdA7647A8aB7c2061c2E118A18a936f13D')).toBe(
      '0xBC4CA0EdA7647A8aB7c2061c2E118A18a936f13D',
    )
  })

  it('非法地址报错', () => {
    expect(() => assertAddress('0x123')).toThrow('合约地址格式错误')
  })

  it('tokenId 解析', () => {
    expect(parseTokenId(' 42 ')).toBe(42n)
  })

  it('tokenId 空报错', () => {
    expect(() => parseTokenId('  ')).toThrow('请输入 tokenId')
  })

  it('tokenId 非法报错', () => {
    expect(() => parseTokenId('-1')).toThrow('tokenId 格式错误')
  })

  it('encodeUint256', () => {
    expect(encodeUint256(1n)).toBe('0'.repeat(63) + '1')
  })

  it('encodeUint256 负数报错', () => {
    expect(() => encodeUint256(-1n)).toThrow('超出 uint256 范围')
  })

  it('encodeUint256 超大报错', () => {
    expect(() => encodeUint256(1n << 256n)).toThrow('超出 uint256 范围')
  })
})

describe('nft-metadata · decodeAbiString', () => {
  it('正常解码', () => {
    expect(decodeAbiString(encodeAbiString('https://example.com/1'))).toBe('https://example.com/1')
  })

  it('非法 hex 报错', () => {
    expect(() => decodeAbiString('zz')).toThrow('格式错误')
  })

  it('奇数位 hex 报错', () => {
    expect(() => decodeAbiString('0x123')).toThrow('格式错误')
  })

  it('过短报错', () => {
    expect(() => decodeAbiString('0x1234')).toThrow('过短')
  })

  it('偏移非 32 报错', () => {
    const bad = `0x${64n.toString(16).padStart(64, '0')}${'00'.repeat(32)}`
    expect(() => decodeAbiString(bad)).toThrow('偏移异常')
  })

  it('长度超安全范围报错', () => {
    const words = `${32n.toString(16).padStart(64, '0')}${(BigInt(Number.MAX_SAFE_INTEGER) + 1n).toString(16).padStart(64, '0')}`
    expect(() => decodeAbiString(`0x${words}`)).toThrow('安全范围')
  })

  it('数据长度不足报错', () => {
    const words = `${32n.toString(16).padStart(64, '0')}${100n.toString(16).padStart(64, '0')}`
    expect(() => decodeAbiString(`0x${words}`)).toThrow('长度不足')
  })
})

describe('nft-metadata · resolveTokenUri', () => {
  const meta = { name: 'T', description: 'D' }

  it('base64 内联解析', () => {
    const r = resolveTokenUri(`data:application/json;base64,${b64json(meta)}`)
    expect(r.kind).toBe('inline')
    if (r.kind === 'inline') expect(r.json).toEqual(meta)
  })

  it('base64 非法报错', () => {
    expect(() => resolveTokenUri('data:application/json;base64,!!!')).toThrow('base64 数据非法')
  })

  it('base64 内联 JSON 非法报错', () => {
    const bad = btoa('not-json{')
    expect(() => resolveTokenUri(`data:application/json;base64,${bad}`)).toThrow(
      '内联 JSON 解析失败',
    )
  })

  it('其他 data 格式报错', () => {
    expect(() => resolveTokenUri('data:text/plain,hi')).toThrow('不支持的 tokenURI data 格式')
  })

  it('ipfs 转网关', () => {
    const r = resolveTokenUri('ipfs://QmHash/1.json')
    expect(r).toEqual({ kind: 'url', url: `${IPFS_GATEWAY}QmHash/1.json` })
  })

  it('ipfs 空路径报错', () => {
    expect(() => resolveTokenUri('ipfs://')).toThrow('路径为空')
  })

  it('https 保持', () => {
    expect(resolveTokenUri('https://example.com/1')).toEqual({
      kind: 'url',
      url: 'https://example.com/1',
    })
  })

  it('空 URI 报错', () => {
    expect(() => resolveTokenUri('  ')).toThrow('tokenURI 为空')
  })

  it('未知协议报错', () => {
    expect(() => resolveTokenUri('ar://xyz')).toThrow('格式不支持')
  })

  it('网关常量', () => {
    expect(IPFS_GATEWAY).toBe('https://ipfs.io/ipfs/')
  })
})

describe('nft-metadata · fetchMetadataJson', () => {
  it('成功返回 JSON', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ name: 'N' }))
    await expect(fetchMetadataJson('https://x.test/1', f)).resolves.toEqual({ name: 'N' })
  })

  it('超时报错', async () => {
    await expect(fetchMetadataJson('https://x.test/1', hangingFetch, 20)).rejects.toThrow('超时')
  })

  it('网络错误', async () => {
    const f: FetchFn = () => Promise.reject(new Error('down'))
    await expect(fetchMetadataJson('https://x.test/1', f)).rejects.toThrow('元数据请求失败')
  })

  it('非 Error throw', async () => {
    const f: FetchFn = () => Promise.reject('nope')
    await expect(fetchMetadataJson('https://x.test/1', f)).rejects.toThrow('nope')
  })

  it('HTTP 错误', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({}, false, 404))
    await expect(fetchMetadataJson('https://x.test/1', f)).rejects.toThrow('HTTP 404')
  })

  it('非法 JSON', async () => {
    const f: FetchFn = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('x')),
      } as Response)
    await expect(fetchMetadataJson('https://x.test/1', f)).rejects.toThrow('合法 JSON')
  })
})

describe('nft-metadata · renderMetadata', () => {
  it('完整元数据渲染', () => {
    const out = renderMetadata({
      name: 'Cool NFT',
      description: 'desc',
      image: 'ipfs://QmImg/image.png',
      external_url: 'https://example.com',
      attributes: [{ trait_type: 'Color', value: 'Blue' }, 'plain-string-attr', {}],
    })
    expect(out).toContain('名称：Cool NFT')
    expect(out).toContain('描述：desc')
    expect(out).toContain(`图片：${IPFS_GATEWAY}QmImg/image.png`)
    expect(out).toContain('外部链接：https://example.com')
    expect(out).toContain('属性（3 项）：')
    expect(out).toContain('Color：Blue')
    expect(out).toContain('plain-string-attr')
    expect(out).toContain('未知：未知')
  })

  it('缺字段占位与无属性', () => {
    const out = renderMetadata({ image: 123 })
    expect(out).toContain('名称：未知')
    expect(out).toContain('描述：无')
    expect(out).toContain('图片：无')
    expect(out).toContain('属性：无')
    expect(out).not.toContain('外部链接')
  })

  it('空属性数组', () => {
    expect(renderMetadata({ attributes: [] })).toContain('属性：无')
  })

  it('http 图片保持原样', () => {
    expect(renderMetadata({ image: 'https://x.test/a.png' })).toContain(
      '图片：https://x.test/a.png',
    )
  })

  it('非对象报错', () => {
    expect(() => renderMetadata(null)).toThrow('合法 JSON 对象')
    expect(() => renderMetadata('str')).toThrow('合法 JSON 对象')
  })
})

describe('nft-metadata · transform', () => {
  const contract = '0xBC4CA0EdA7647A8aB7c2061c2E118A18a936f13D'

  function stubFetch(handler: (url: string) => Promise<Response>) {
    const spy = vi.fn((url: string, _init?: RequestInit) => handler(url))
    const realFetch = globalThis.fetch
    globalThis.fetch = spy as unknown as typeof fetch
    return {
      spy,
      restore: () => {
        globalThis.fetch = realFetch
      },
    }
  }

  it('超长输入报错', async () => {
    await expect(transform({ text: '1'.repeat(200001) }, { contract, rpcUrl: '' })).rejects.toThrow(
      '200,000',
    )
  })

  it('内联 base64 元数据（单次 RPC）', async () => {
    const tokenUri = `data:application/json;base64,${b64json({ name: 'Inline NFT', image: 'ipfs://QmI/1.png', attributes: [] })}`
    const { spy, restore } = stubFetch(() =>
      Promise.resolve(jsonResponse({ result: encodeAbiString(tokenUri) })),
    )
    try {
      const out = await transform({ text: '1' }, { contract, rpcUrl: '' })
      expect(out).toContain('名称：Inline NFT')
      expect(out).toContain(`图片：${IPFS_GATEWAY}QmI/1.png`)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toBe(DEFAULT_RPC_URL)
      // eth_call 参数校验
      const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
      expect(body.method).toBe('eth_call')
      expect(body.params[0].to).toBe(contract)
      expect(body.params[0].data.startsWith('0xc87b56dd')).toBe(true)
    } finally {
      restore()
    }
  })

  it('https 元数据二次拉取', async () => {
    const { spy, restore } = stubFetch((url) => {
      if (url === 'https://meta.example/1')
        return Promise.resolve(jsonResponse({ name: 'Remote NFT' }))
      return Promise.resolve(jsonResponse({ result: encodeAbiString('https://meta.example/1') }))
    })
    try {
      const out = await transform({ text: '2' }, { contract, rpcUrl: 'https://my.rpc' })
      expect(out).toContain('名称：Remote NFT')
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy.mock.calls[0][0]).toBe('https://my.rpc')
    } finally {
      restore()
    }
  })

  it('eth_call 非 string 报错', async () => {
    const { restore } = stubFetch(() => Promise.resolve(jsonResponse({ result: 123 })))
    try {
      await expect(transform({ text: '1' }, { contract, rpcUrl: '' })).rejects.toThrow(
        'eth_call 返回格式异常',
      )
    } finally {
      restore()
    }
  })

  it('非法 tokenId 透出中文错误', async () => {
    await expect(transform({ text: 'abc' }, { contract, rpcUrl: '' })).rejects.toThrow('tokenId')
  })

  it('非法合约地址透出中文错误', async () => {
    await expect(transform({ text: '1' }, { contract: '0x123', rpcUrl: '' })).rejects.toThrow(
      '合约地址格式错误',
    )
  })
})
