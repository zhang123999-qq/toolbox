/**
 * browser-info（#859）utils 单测：UA 解析、操作系统识别、特性检测。
 */
import { describe, expect, it } from 'vitest'
import { FEATURE_CHECKS, detectFeatures, parseUA } from './utils'

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
const FIREFOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0'
const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

describe('parseUA', () => {
  it('Chrome on Windows → Chrome/Blink/Windows', () => {
    expect(parseUA(CHROME_UA)).toEqual({
      browser: 'Chrome',
      version: '126.0.0.0',
      os: 'Windows',
      engine: 'Blink',
    })
  })
  it('Edge UA 优先识别为 Edge 而非 Chrome', () => {
    const r = parseUA(EDGE_UA)
    expect(r.browser).toBe('Edge')
    expect(r.version).toBe('126.0.0.0')
    expect(r.engine).toBe('Blink')
  })
  it('Firefox → Gecko', () => {
    const r = parseUA(FIREFOX_UA)
    expect(r.browser).toBe('Firefox')
    expect(r.version).toBe('127.0')
    expect(r.engine).toBe('Gecko')
    expect(r.os).toBe('Windows')
  })
  it('Safari → WebKit/macOS', () => {
    const r = parseUA(SAFARI_UA)
    expect(r.browser).toBe('Safari')
    expect(r.version).toBe('17.4')
    expect(r.engine).toBe('WebKit')
    expect(r.os).toBe('macOS')
  })
  it('Android Chrome → Android', () => {
    expect(parseUA(ANDROID_UA).os).toBe('Android')
  })
  it('iPhone Safari → iOS', () => {
    expect(parseUA(IPHONE_UA).os).toBe('iOS')
  })
  it('Linux UA → Linux', () => {
    expect(parseUA('Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0').os).toBe('Linux')
  })
  it('无法识别的 UA 返回 unknown 而不抛错', () => {
    expect(parseUA('SomeBot/1.0')).toEqual({
      browser: 'unknown',
      version: '',
      os: 'unknown',
      engine: '',
    })
  })
  it('空字符串抛中文错误', () => {
    expect(() => parseUA('')).toThrow('UA 字符串不能为空')
  })
  it('空白字符串抛中文错误', () => {
    expect(() => parseUA('   ')).toThrow('UA 字符串不能为空')
  })
})

describe('detectFeatures', () => {
  it('空对象 → 全部 false', () => {
    const r = detectFeatures({})
    for (const f of FEATURE_CHECKS) expect(r[f.id]).toBe(false)
  })
  it('navigator 缺失时 navigator 相关特性为 false', () => {
    const r = detectFeatures({ fetch: () => undefined })
    expect(r['fetch']).toBe(true)
    expect(r['serviceWorker']).toBe(false)
    expect(r['webgpu']).toBe(false)
    expect(r['clipboard']).toBe(false)
  })
  it('navigator 部分字段 → 对应特性为 true', () => {
    const r = detectFeatures({ navigator: { serviceWorker: {}, gpu: {} } })
    expect(r['serviceWorker']).toBe(true)
    expect(r['webgpu']).toBe(true)
    expect(r['clipboard']).toBe(false)
  })
  it('WebSocket/WebGL 函数存在时为 true', () => {
    const r = detectFeatures({ WebSocket: function () {}, WebGLRenderingContext: function () {} })
    expect(r['websocket']).toBe(true)
    expect(r['webgl']).toBe(true)
  })
  it('缺省 scope 时取 globalThis 且不抛错', () => {
    expect(() => detectFeatures()).not.toThrow()
    expect(() => detectFeatures(null)).not.toThrow()
  })
})
