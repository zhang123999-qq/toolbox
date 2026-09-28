/**
 * extension-publish（#784）utils 单测：发布前检查。
 */
import { describe, expect, it } from 'vitest'
import {
  checkPublishReady,
  parsePublishInput,
  PUBLISH_CHECKLIST,
  renderPublishResults,
  STORE_NAMES,
} from './utils'
import type { PublishInput } from './utils'

const BASE_MANIFEST = JSON.stringify({
  manifest_version: 3,
  name: '示例',
  version: '1.0.0',
  description: '描述',
  icons: { '128': 'icon128.png' },
  permissions: ['storage'],
})

function input(over: Partial<PublishInput> = {}): PublishInput {
  return {
    store: 'chrome',
    manifestText: BASE_MANIFEST,
    files: ['manifest.json', 'icon128.png'],
    ...over,
  }
}

describe('checkPublishReady', () => {
  it('chrome 全部通过', () => {
    const results = checkPublishReady(
      input({ zipSizeKb: 100, hasScreenshots: true }),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results).toHaveLength(PUBLISH_CHECKLIST.filter((c) => c.stores.includes('chrome')).length)
  })
  it('firefox 包含源码检查项', () => {
    const results = checkPublishReady(input({ store: 'firefox', zipSizeKb: 100, hasScreenshots: true }))
    expect(results.some((r) => r.id === 'firefox-source' && r.ok)).toBe(true)
  })
  it('缺少 manifest.json 文件', () => {
    const results = checkPublishReady(input({ files: [] }))
    expect(results.find((r) => r.id === 'manifest-exists')?.ok).toBe(false)
  })
  it('manifest 非法 JSON', () => {
    const results = checkPublishReady(input({ manifestText: '{bad' }))
    expect(results.find((r) => r.id === 'manifest-valid')?.ok).toBe(false)
    expect(results.find((r) => r.id === 'meta-complete')?.message).toContain('解析失败')
    expect(results.find((r) => r.id === 'icons')?.message).toContain('解析失败')
    expect(results.find((r) => r.id === 'privacy-policy')?.message).toContain('解析失败')
  })
  it('manifest 根节点非对象', () => {
    const results = checkPublishReady(input({ manifestText: '42' }))
    expect(results.find((r) => r.id === 'manifest-valid')?.ok).toBe(false)
  })
  it('manifest_version 非 3', () => {
    const results = checkPublishReady(
      input({ manifestText: JSON.stringify({ manifest_version: 2 }) }),
    )
    expect(results.find((r) => r.id === 'manifest-valid')?.message).toContain('应为 3')
  })
  it('meta 字段缺失', () => {
    const results = checkPublishReady(
      input({ manifestText: JSON.stringify({ manifest_version: 3, name: '  ' }) }),
    )
    const msg = results.find((r) => r.id === 'meta-complete')?.message ?? ''
    expect(msg).toContain('version')
    expect(msg).toContain('description')
  })
  it('未声明 icons / 缺少 128 图标 / 图标文件缺失', () => {
    const noIcons = checkPublishReady(
      input({ manifestText: JSON.stringify({ manifest_version: 3 }) }),
    )
    expect(noIcons.find((r) => r.id === 'icons')?.message).toContain('未声明 icons')
    const no128 = checkPublishReady(
      input({ manifestText: JSON.stringify({ manifest_version: 3, icons: { '16': 'a.png' } }) }),
    )
    expect(no128.find((r) => r.id === 'icons')?.message).toContain('128px')
    const missingFile = checkPublishReady(input({ files: ['manifest.json'] }))
    expect(missingFile.find((r) => r.id === 'icons')?.ok).toBe(false)
  })
  it('zip 大小：未提供 / 通过 / 超限', () => {
    expect(checkPublishReady(input()).find((r) => r.id === 'zip-size')?.ok).toBe(false)
    expect(checkPublishReady(input({ zipSizeKb: 100 })).find((r) => r.id === 'zip-size')?.ok).toBe(true)
    const over = checkPublishReady(input({ zipSizeKb: 200 * 1024 }))
    expect(over.find((r) => r.id === 'zip-size')?.ok).toBe(false)
  })
  it('截图未准备', () => {
    expect(checkPublishReady(input({ zipSizeKb: 1 })).find((r) => r.id === 'screenshots')?.ok).toBe(false)
  })
  it('隐私政策：无敏感权限通过 / 有敏感权限未提供不通过 / 已提供通过', () => {
    const none = checkPublishReady(input({ zipSizeKb: 1, hasScreenshots: true }))
    expect(none.find((r) => r.id === 'privacy-policy')?.ok).toBe(true)
    const sensitiveManifest = JSON.stringify({
      manifest_version: 3,
      permissions: ['tabs'],
      host_permissions: ['<all_urls>'],
    })
    const missing = checkPublishReady(input({ manifestText: sensitiveManifest }))
    expect(missing.find((r) => r.id === 'privacy-policy')?.ok).toBe(false)
    const provided = checkPublishReady(input({ manifestText: sensitiveManifest, hasPrivacyPolicy: true }))
    expect(provided.find((r) => r.id === 'privacy-policy')?.ok).toBe(true)
  })
})

describe('renderPublishResults', () => {
  it('全部通过输出结论', () => {
    const out = renderPublishResults('chrome', checkPublishReady(input({ zipSizeKb: 1, hasScreenshots: true })))
    expect(out).toContain(STORE_NAMES.chrome)
    expect(out).toContain('全部通过')
  })
  it('有未通过项时列出', () => {
    const out = renderPublishResults('edge', checkPublishReady(input({ store: 'edge' })))
    expect(out).toContain('[未通过]')
  })
})

describe('parsePublishInput', () => {
  it('解析合法输入', () => {
    expect(parsePublishInput('{"zipSizeKb":10,"hasScreenshots":true}')).toEqual({
      zipSizeKb: 10,
      hasScreenshots: true,
    })
    expect(parsePublishInput('{}')).toEqual({})
  })
  it('非法 JSON / 非对象报错', () => {
    expect(() => parsePublishInput('{bad')).toThrow('不是合法 JSON')
    expect(() => parsePublishInput('null')).toThrow('必须是 JSON 对象')
    expect(() => parsePublishInput('[1]')).toThrow('必须是 JSON 对象')
  })
  it('字段类型校验', () => {
    expect(() => parsePublishInput('{"zipSizeKb":-1}')).toThrow('zipSizeKb')
    expect(() => parsePublishInput('{"zipSizeKb":"x"}')).toThrow('zipSizeKb')
    expect(() => parsePublishInput('{"hasScreenshots":1}')).toThrow('hasScreenshots')
    expect(() => parsePublishInput('{"hasPrivacyPolicy":"yes"}')).toThrow('hasPrivacyPolicy')
  })
})
