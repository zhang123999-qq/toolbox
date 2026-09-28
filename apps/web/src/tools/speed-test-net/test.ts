/**
 * speed-test-net（#837）utils 单测：带宽测速（fetch / 计时全 mock）。
 */
import { describe, expect, it } from 'vitest'
import {
  SpeedNetError,
  formatResult,
  gradeSpeed,
  measureDownload,
  measureUpload,
  toMbps,
  transform,
  validateUrl,
  type FetchFn,
  type NowFn,
} from './utils'

const okFetch =
  (bytes: number): FetchFn =>
  async () =>
    new Response(new Uint8Array(bytes), { status: 200 })

const seqNow = (...ts: number[]): NowFn => {
  let i = 0
  return () => ts[Math.min(i++, ts.length - 1)] as number
}

describe('validateUrl', () => {
  it('空输入抛中文错误', () => {
    expect(() => validateUrl('  ')).toThrow('请输入测速端点 URL')
  })
  it('非法 URL 抛中文错误', () => {
    expect(() => validateUrl('not a url')).toThrow('URL 格式不正确')
  })
  it('非 http(s) 协议被拒绝', () => {
    expect(() => validateUrl('ftp://example.com/x')).toThrow('只支持 http:// 与 https:// 协议')
  })
  it('合法 URL 返回规范化 href', () => {
    expect(validateUrl('https://example.com/speed')).toBe('https://example.com/speed')
  })
})

describe('toMbps', () => {
  it('1000000 字节 / 1000ms = 8 Mbps', () => {
    expect(toMbps(1000000, 1000)).toBe(8)
  })
  it('保留 2 位小数', () => {
    expect(toMbps(12000, 3000)).toBe(0.03)
  })
  it('负字节数抛错', () => {
    expect(() => toMbps(-1, 1000)).toThrow('字节数必须为非负数')
  })
  it('非有限字节数抛错', () => {
    expect(() => toMbps(NaN, 1000)).toThrow('字节数必须为非负数')
  })
  it('用时 ≤0 抛错', () => {
    expect(() => toMbps(1000, 0)).toThrow('计时异常')
    expect(() => toMbps(1000, -5)).toThrow('计时异常')
    expect(() => toMbps(1000, NaN)).toThrow('计时异常')
  })
})

describe('measureDownload', () => {
  it('下载 8000 字节耗时 1000ms = 0.06 Mbps', async () => {
    const r = await measureDownload('https://example.com/f', okFetch(8000), seqNow(0, 1000))
    expect(r.kind).toBe('download')
    expect(r.bytes).toBe(8000)
    expect(r.ms).toBe(1000)
    expect(r.mbps).toBe(0.06)
  })
  it('fetch 抛错转为中文错误', async () => {
    const bad: FetchFn = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(measureDownload('https://example.com/f', bad, seqNow(0, 1))).rejects.toThrow(
      '下载请求失败：网络不可达或被 CORS 拦截',
    )
  })
  it('非 2xx 状态抛错', async () => {
    const f: FetchFn = async () => new Response('x', { status: 404 })
    await expect(measureDownload('https://example.com/f', f, seqNow(0, 1))).rejects.toThrow(
      '下载请求失败：HTTP 404',
    )
  })
  it('读取 body 失败抛错', async () => {
    const f: FetchFn = async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.error(new Error('boom'))
          },
        }),
        {
          status: 200,
        },
      )
    await expect(measureDownload('https://example.com/f', f, seqNow(0, 1))).rejects.toThrow(
      '读取响应体失败',
    )
  })
  it('非法 URL 直接抛错', async () => {
    await expect(measureDownload('oops', okFetch(1), seqNow(0, 1))).rejects.toThrow(
      'URL 格式不正确',
    )
  })
})

describe('measureUpload', () => {
  it('上传 1024 字节耗时 500ms = 0.02 Mbps', async () => {
    const r = await measureUpload('https://example.com/u', 1024, okFetch(0), seqNow(0, 500))
    expect(r.kind).toBe('upload')
    expect(r.bytes).toBe(1024)
    expect(r.ms).toBe(500)
    expect(r.mbps).toBe(0.02)
  })
  it('默认上传 256KB', async () => {
    const r = await measureUpload('https://example.com/u', undefined, okFetch(0), seqNow(0, 1000))
    expect(r.bytes).toBe(262144)
  })
  it('fetch 抛错转为中文错误', async () => {
    const bad: FetchFn = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(measureUpload('https://example.com/u', 64, bad, seqNow(0, 1))).rejects.toThrow(
      '上传请求失败：网络不可达或被 CORS 拦截',
    )
  })
  it('非 2xx 状态抛错', async () => {
    const f: FetchFn = async () => new Response('x', { status: 500 })
    await expect(measureUpload('https://example.com/u', 64, f, seqNow(0, 1))).rejects.toThrow(
      '上传请求失败：HTTP 500',
    )
  })
  it('非法数据量抛错', async () => {
    await expect(
      measureUpload('https://example.com/u', 0, okFetch(0), seqNow(0, 1)),
    ).rejects.toThrow('上传数据量必须为正整数')
    await expect(
      measureUpload('https://example.com/u', 1.5, okFetch(0), seqNow(0, 1)),
    ).rejects.toThrow('上传数据量必须为正整数')
  })
})

describe('gradeSpeed', () => {
  it('<10 为较慢', () => {
    expect(gradeSpeed(0)).toBe('较慢')
    expect(gradeSpeed(9.99)).toBe('较慢')
  })
  it('10–100 为良好', () => {
    expect(gradeSpeed(10)).toBe('良好')
    expect(gradeSpeed(100)).toBe('良好')
  })
  it('>100 为优秀', () => {
    expect(gradeSpeed(100.01)).toBe('优秀')
  })
  it('非法速率抛错', () => {
    expect(() => gradeSpeed(-1)).toThrow('速率必须为非负数')
    expect(() => gradeSpeed(NaN)).toThrow('速率必须为非负数')
  })
})

describe('formatResult', () => {
  it('下载结果含下载标签', () => {
    expect(formatResult({ kind: 'download', bytes: 100, ms: 50, mbps: 0.02 })).toContain('下载速率')
  })
  it('上传结果含上传标签', () => {
    expect(formatResult({ kind: 'upload', bytes: 100, ms: 50, mbps: 0.02 })).toContain('上传速率')
  })
})

describe('transform', () => {
  it('空输入返回空字符串', async () => {
    expect(await transform({ text: '  ' }, { mode: 'both', uploadKb: '256' })).toBe('')
  })
  it('仅下载模式', async () => {
    const s = await transform(
      { text: 'https://example.com/f' },
      { mode: 'download', uploadKb: '256' },
      okFetch(8000),
      seqNow(0, 1000),
    )
    expect(s).toContain('下载速率')
    expect(s).not.toContain('上传速率')
  })
  it('仅上传模式', async () => {
    const s = await transform(
      { text: 'https://example.com/u' },
      { mode: 'upload', uploadKb: '1' },
      okFetch(0),
      seqNow(0, 500),
    )
    expect(s).toContain('上传速率')
    expect(s).not.toContain('下载速率')
  })
  it('双模式输出两行', async () => {
    const s = await transform(
      { text: 'https://example.com/x' },
      { mode: 'both', uploadKb: '1' },
      okFetch(8000),
      seqNow(0, 1000, 1000, 2000),
    )
    expect(s).toContain('下载速率')
    expect(s).toContain('上传速率')
  })
  it('非法上传大小抛中文错误', async () => {
    await expect(
      transform(
        { text: 'https://example.com/u' },
        { mode: 'upload', uploadKb: 'abc' },
        okFetch(0),
        seqNow(0, 1),
      ),
    ).rejects.toThrow('上传数据量必须为正整数')
  })
})

describe('SpeedNetError', () => {
  it('name 为 SpeedNetError', () => {
    expect(new SpeedNetError('x').name).toBe('SpeedNetError')
  })
})
