/**
 * content-script（#772）utils 单测：Content Script 模板生成与校验。
 */
import { describe, expect, it } from 'vitest'
import {
  generateContentScript,
  parseContentScriptInput,
  validateContentScriptOptions,
  validateMatchPattern,
  type ContentScriptOptions,
} from './utils'

const BASE: ContentScriptOptions = {
  matches: ['https://example.com/*'],
  runAt: 'document_idle',
  features: ['dom-observe', 'storage-sync'],
}

describe('validateMatchPattern', () => {
  it('合法模式通过', () => {
    expect(() => validateMatchPattern('https://example.com/*')).not.toThrow()
    expect(() => validateMatchPattern('*://*.example.com/path/*')).not.toThrow()
    expect(() => validateMatchPattern('http://localhost:3000/')).not.toThrow()
    expect(() => validateMatchPattern('<all_urls>')).not.toThrow()
    expect(() => validateMatchPattern('  https://a.com/*  ')).not.toThrow()
  })
  it('非字符串或空字符串报错', () => {
    expect(() => validateMatchPattern(123)).toThrow('必须是非空字符串')
    expect(() => validateMatchPattern('')).toThrow('必须是非空字符串')
    expect(() => validateMatchPattern('   ')).toThrow('必须是非空字符串')
  })
  it('非法模式报错', () => {
    expect(() => validateMatchPattern('notaurl')).toThrow('非法匹配模式')
    expect(() => validateMatchPattern('ftp://a.com/*')).toThrow('非法匹配模式')
    expect(() => validateMatchPattern('https://')).toThrow('非法匹配模式')
    expect(() => validateMatchPattern('https://a.com')).toThrow('非法匹配模式')
  })
})

describe('validateContentScriptOptions', () => {
  it('合法输入通过', () => {
    expect(() => validateContentScriptOptions(BASE)).not.toThrow()
  })
  it('matches 为空或非法报错', () => {
    expect(() => validateContentScriptOptions({ ...BASE, matches: [] })).toThrow('至少需要一个')
    expect(() =>
      validateContentScriptOptions({ ...BASE, matches: 'x' as never }),
    ).toThrow('至少需要一个')
    expect(() => validateContentScriptOptions(undefined as never)).toThrow('至少需要一个')
    expect(() => validateContentScriptOptions({ ...BASE, matches: ['bad'] })).toThrow(
      '非法匹配模式',
    )
  })
  it('runAt 非法报错', () => {
    expect(() =>
      validateContentScriptOptions({ ...BASE, runAt: 'now' as never }),
    ).toThrow('runAt 非法')
  })
  it('features 非数组报错', () => {
    expect(() =>
      validateContentScriptOptions({ ...BASE, features: 'x' as never }),
    ).toThrow('features 必须是数组')
  })
  it('未知特性报错', () => {
    expect(() =>
      validateContentScriptOptions({ ...BASE, features: ['nope' as never] }),
    ).toThrow('未知特性')
  })
})

describe('generateContentScript', () => {
  it('生成包含消息通信骨架', () => {
    const code = generateContentScript(BASE)
    expect(code).toContain('chrome.runtime.onMessage.addListener')
    expect(code).toContain('notifyBackground')
    expect(code).toContain('matches: https://example.com/*')
    expect(code).toContain('run_at: document_idle')
  })
  it('特性块按需拼接', () => {
    const all = generateContentScript({
      ...BASE,
      features: ['dom-observe', 'context-menu', 'storage-sync'],
    })
    expect(all).toContain('MutationObserver')
    expect(all).toContain('contextmenu')
    expect(all).toContain('chrome.storage.sync')
    const none = generateContentScript({ ...BASE, features: [] })
    expect(none).not.toContain('MutationObserver')
    expect(none).not.toContain('contextmenu')
    expect(none).not.toContain('chrome.storage.sync')
    expect(none).toContain('features: （无）')
  })
  it('重复特性去重', () => {
    const code = generateContentScript({
      ...BASE,
      features: ['dom-observe', 'dom-observe'],
    })
    expect(code).toContain('features: dom-observe')
    expect(code.match(/MutationObserver/g)?.length).toBe(2)
  })
  it('context-menu 单独生成', () => {
    const code = generateContentScript({ ...BASE, features: ['context-menu'] })
    expect(code).toContain('contextmenu')
    expect(code).not.toContain('MutationObserver')
  })
  it('非法输入抛错', () => {
    expect(() => generateContentScript({ ...BASE, matches: [] })).toThrow('至少需要一个')
  })
})

describe('parseContentScriptInput', () => {
  it('合法 JSON 解析', () => {
    const o = parseContentScriptInput(
      '{"matches":["https://a.com/*"],"runAt":"document_start","features":["context-menu"]}',
    )
    expect(o.matches).toEqual(['https://a.com/*'])
    expect(o.runAt).toBe('document_start')
    expect(o.features).toEqual(['context-menu'])
  })
  it('缺省字段有默认值', () => {
    const o = parseContentScriptInput('{"matches":["https://a.com/*"]}')
    expect(o.runAt).toBe('document_idle')
    expect(o.features).toEqual([])
  })
  it('非字符串 runAt 走默认', () => {
    const o = parseContentScriptInput('{"matches":["https://a.com/*"],"runAt":1}')
    expect(o.runAt).toBe('document_idle')
  })
  it('非法 JSON 报错', () => {
    expect(() => parseContentScriptInput('{')).toThrow('不是合法 JSON')
  })
  it('非对象报错', () => {
    expect(() => parseContentScriptInput('"x"')).toThrow('必须是 JSON 对象')
    expect(() => parseContentScriptInput('[1]')).toThrow('必须是 JSON 对象')
  })
  it('matches 缺省走默认分支并触发校验', () => {
    expect(() => parseContentScriptInput('{}')).toThrow('至少需要一个')
  })
  it('解析后仍做业务校验', () => {
    expect(() => parseContentScriptInput('{"matches":[]}')).toThrow('至少需要一个')
    expect(() => parseContentScriptInput('{"matches":["https://a.com/*"],"runAt":"x"}')).toThrow(
      'runAt 非法',
    )
  })
})
