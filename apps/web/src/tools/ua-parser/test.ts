import { describe, expect, it } from 'vitest'
import { parseUa, transform } from './utils'

const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const EDGE_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
const FIREFOX_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0'
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

describe('ua-parser / parseUa', () => {
  it('Chrome on Windows', () => {
    const r = parseUa(CHROME_WIN)
    expect(r.browser).toBe('Chrome')
    expect(r.browserVersion).toBe('126.0.0.0')
    expect(r.os).toBe('Windows 10/11')
    expect(r.device).toBe('桌面')
    expect(r.engine).toBe('Blink')
  })

  it('Edge 优先于 Chrome 识别', () => {
    const r = parseUa(EDGE_WIN)
    expect(r.browser).toBe('Microsoft Edge')
    expect(r.engine).toBe('Blink')
  })

  it('Firefox', () => {
    const r = parseUa(FIREFOX_WIN)
    expect(r.browser).toBe('Firefox')
    expect(r.browserVersion).toBe('127.0')
    expect(r.engine).toBe('Gecko')
  })

  it('Safari on macOS', () => {
    const r = parseUa(SAFARI_MAC)
    expect(r.browser).toBe('Safari')
    expect(r.browserVersion).toBe('17.5')
    expect(r.os).toBe('macOS 10.15.7')
    expect(r.engine).toBe('WebKit')
  })

  it('iPhone 是 iOS 手机', () => {
    const r = parseUa(IPHONE)
    expect(r.os).toBe('iOS 17.5')
    expect(r.device).toBe('手机')
    expect(r.browser).toBe('Safari')
  })

  it('Android Chrome 是手机', () => {
    const r = parseUa(ANDROID)
    expect(r.os).toBe('Android 14')
    expect(r.device).toBe('手机')
    expect(r.browser).toBe('Chrome')
  })

  it('未知 UA 兜底', () => {
    const r = parseUa('curl/8.0')
    expect(r.browser).toBe('未知')
    expect(r.device).toBe('桌面')
  })
})

describe('ua-parser / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('输出四行结果', () => {
    const out = transform({ text: CHROME_WIN }, {})
    expect(out).toContain('浏览器：Chrome 126.0.0.0')
    expect(out).toContain('操作系统：Windows 10/11')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
