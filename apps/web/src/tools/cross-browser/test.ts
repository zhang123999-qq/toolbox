/**
 * cross-browser（#778）utils 单测：API 对照、垫片生成、兼容性扫描。
 */
import { describe, expect, it } from 'vitest'
import {
  API_COMPAT,
  generatePolyfill,
  getApiCompat,
  listApis,
  parseCrossBrowserInput,
  runCrossBrowser,
  scanChromeUsage,
  styleLabel,
} from './utils'

describe('styleLabel', () => {
  it('三种风格标签', () => {
    expect(styleLabel('promise')).toBe('Promise')
    expect(styleLabel('callback')).toBe('回调')
    expect(styleLabel('unsupported')).toBe('不支持')
  })
})

describe('listApis / getApiCompat', () => {
  it('列出全部对照 API', () => {
    const apis = listApis()
    expect(apis).toContain('storage.sync')
    expect(apis).toContain('scripting.executeScript')
    expect(apis.length).toBe(Object.keys(API_COMPAT).length)
  })
  it('查到已知 API 的对照信息', () => {
    const c = getApiCompat('alarms.create')
    expect(c.chromeApi).toBe('chrome.alarms.create')
    expect(c.safari).toBe('unsupported')
  })
  it('未知或非法 API 报错', () => {
    expect(() => getApiCompat('nope.nope')).toThrow('未知 API')
    expect(() => getApiCompat('')).toThrow('API 名必须是非空字符串')
    expect(() => getApiCompat(123)).toThrow('API 名必须是非空字符串')
  })
})

describe('generatePolyfill', () => {
  it('生成单个 API 垫片', () => {
    const code = generatePolyfill(['storage.sync'])
    expect(code).toContain('function storageSyncGet')
    expect(code).toContain('chrome.storage.sync')
    expect(code).toContain('browser.storage.sync')
  })
  it('多 API 拼接并去重', () => {
    const code = generatePolyfill(['tabs.query', 'tabs.query', 'runtime.sendMessage'])
    expect(code.match(/function tabsQuery/g)?.length).toBe(1)
    expect(code).toContain('function runtimeSendMessage')
  })
  it('注释携带兼容性信息', () => {
    const code = generatePolyfill(['action.setBadgeText'])
    expect(code).toContain('Safari=不支持')
  })
  it('非法输入报错', () => {
    expect(() => generatePolyfill([])).toThrow('至少选择一个 API')
    expect(() => generatePolyfill('x')).toThrow('至少选择一个 API')
    expect(() => generatePolyfill([''])).toThrow('API 名必须是非空字符串')
    expect(() => generatePolyfill([42])).toThrow('API 名必须是非空字符串')
    expect(() => generatePolyfill(['unknown.api'])).toThrow('未知 API')
  })
})

describe('scanChromeUsage', () => {
  it('识别已知 API 并给出建议', () => {
    const findings = scanChromeUsage('chrome.tabs.query({}); chrome.alarms.create("t", {});')
    expect(findings.length).toBe(2)
    expect(findings[0].api).toBe('tabs.query')
    expect(findings[0].index).toBe(0)
    expect(findings[1].api).toBe('alarms.create')
    expect(findings[1].safari).toBe('unsupported')
  })
  it('两级但未收录的 API 也提示查阅', () => {
    const findings = scanChromeUsage('chrome.runtime.getManifest()')
    expect(findings[0].api).toBe('runtime.getManifest')
    expect(findings[0].suggestion).toContain('未收录的 API')
  })
  it('未收录 API 提示查阅 MDN', () => {
    const findings = scanChromeUsage('chrome.foo.bar()')
    expect(findings[0].firefox).toBe('unsupported')
    expect(findings[0].suggestion).toContain('MDN')
  })
  it('单级调用（无方法名）也能识别', () => {
    const findings = scanChromeUsage('if (chrome.storage) { console.log(1) }')
    expect(findings[0].api).toBe('storage')
    expect(findings[0].suggestion).toContain('未收录的 API')
  })
  it('重复出现只报告一次', () => {
    const findings = scanChromeUsage('chrome.tabs.query(a); chrome.tabs.query(b);')
    expect(findings.length).toBe(1)
  })
  it('无 chrome 调用返回空数组', () => {
    expect(scanChromeUsage('console.log(1)')).toEqual([])
  })
  it('非法输入报错', () => {
    expect(() => scanChromeUsage('')).toThrow('待扫描代码必须是非空字符串')
    expect(() => scanChromeUsage(123)).toThrow('待扫描代码必须是非空字符串')
  })
})

describe('parseCrossBrowserInput / runCrossBrowser', () => {
  it('polyfill 任务端到端', () => {
    const out = runCrossBrowser(
      parseCrossBrowserInput('{"task":"polyfill","apis":["storage.sync"]}'),
    )
    expect(out).toContain('function storageSyncGet')
  })
  it('scan 任务端到端', () => {
    const out = runCrossBrowser(
      parseCrossBrowserInput('{"task":"scan","code":"chrome.tabs.query({})"}'),
    )
    expect(out).toContain('tabs.query')
    expect(out).toContain('1.')
  })
  it('scan 无调用时提示', () => {
    expect(runCrossBrowser({ task: 'scan', code: 'let a = 1' })).toBe('未发现 chrome.* 调用。')
  })
  it('非法输入报错', () => {
    expect(() => parseCrossBrowserInput('')).toThrow('输入不能为空')
    expect(() => parseCrossBrowserInput('{oops')).toThrow('输入不是合法 JSON')
    expect(() => parseCrossBrowserInput('[]')).toThrow('输入必须是 JSON 对象')
    expect(() => parseCrossBrowserInput('{"task":"x"}')).toThrow('task 非法')
    expect(() => parseCrossBrowserInput('{"task":"polyfill"}')).toThrow(
      'polyfill 任务需要 apis 数组',
    )
    expect(() => parseCrossBrowserInput('{"task":"scan"}')).toThrow('scan 任务需要 code 字符串')
  })
})
