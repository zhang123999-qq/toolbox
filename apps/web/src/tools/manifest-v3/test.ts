/**
 * manifest-v3（#771）utils 单测：Manifest V3 生成与校验。
 */
import { describe, expect, it } from 'vitest'
import { buildManifestV3, parseManifestConfig, validateManifestV3, type ManifestV3Input } from './utils'

const BASE: ManifestV3Input = {
  name: '我的扩展',
  version: '1.0.0',
  description: '示例',
  permissions: ['storage'],
  hostPermissions: ['https://api.example.com/*'],
  action: { defaultTitle: '打开' },
  backgroundServiceWorker: 'background.js',
  contentScripts: [{ matches: ['https://example.com/*'], js: ['content.js'] }],
}

describe('validateManifestV3', () => {
  it('合法输入通过', () => {
    expect(validateManifestV3(BASE)).toEqual([])
  })
  it('name 为空报错', () => {
    expect(validateManifestV3({ ...BASE, name: '  ' })).toContain('name 不能为空')
  })
  it('version 非法报错', () => {
    expect(validateManifestV3({ ...BASE, version: 'v1' })).toContain(
      'version 必须是 1～4 段数字版本号（如 1.0.0）',
    )
    expect(validateManifestV3({ ...BASE, version: '1.0.0.0.1' })).toContain(
      'version 必须是 1～4 段数字版本号（如 1.0.0）',
    )
  })
  it('未知权限报错', () => {
    expect(validateManifestV3({ ...BASE, permissions: ['hack'] })).toContain('未知权限：hack')
  })
  it('host_permissions 非法报错', () => {
    expect(validateManifestV3({ ...BASE, hostPermissions: ['not a url'] })).toContain(
      'host_permissions 格式非法：not a url',
    )
    expect(validateManifestV3({ ...BASE, hostPermissions: ['<all_urls>'] })).toEqual([])
  })
  it('content_scripts 缺字段报错', () => {
    expect(
      validateManifestV3({ ...BASE, contentScripts: [{ matches: [], js: [] }] }),
    ).toEqual(['content_scripts[0].matches 不能为空', 'content_scripts[0].js 不能为空'])
  })
  it('content_scripts runAt 非法报错', () => {
    expect(
      validateManifestV3({
        ...BASE,
        contentScripts: [{ matches: ['https://a.com/*'], js: ['a.js'], runAt: 'x' as never }],
      }),
    ).toContain('content_scripts[0].runAt 非法')
  })
})

describe('buildManifestV3', () => {
  it('生成标准 manifest.json', () => {
    const out = JSON.parse(buildManifestV3(BASE))
    expect(out.manifest_version).toBe(3)
    expect(out.name).toBe('我的扩展')
    expect(out.action.default_title).toBe('打开')
    expect(out.background.service_worker).toBe('background.js')
    expect(out.content_scripts[0].matches).toEqual(['https://example.com/*'])
  })
  it('可选字段缺省时不输出', () => {
    const out = JSON.parse(buildManifestV3({ name: 'x', version: '1', permissions: [], hostPermissions: [] }))
    expect(out.description).toBeUndefined()
    expect(out.permissions).toBeUndefined()
    expect(out.action).toBeUndefined()
    expect(out.background).toBeUndefined()
    expect(out.content_scripts).toBeUndefined()
  })
  it('空 action 对象不输出', () => {
    const out = JSON.parse(buildManifestV3({ ...BASE, action: {} }))
    expect(out.action).toBeUndefined()
  })
  it('action 带 popup', () => {
    const out = JSON.parse(
      buildManifestV3({ ...BASE, action: { defaultPopup: 'popup.html' } }),
    )
    expect(out.action.default_popup).toBe('popup.html')
  })
  it('content_scripts 带 css 与 runAt', () => {
    const out = JSON.parse(
      buildManifestV3({
        ...BASE,
        contentScripts: [
          { matches: ['https://a.com/*'], js: ['a.js'], css: ['a.css'], runAt: 'document_start' },
        ],
      }),
    )
    expect(out.content_scripts[0].css).toEqual(['a.css'])
    expect(out.content_scripts[0].run_at).toBe('document_start')
  })
  it('校验失败抛中文错', () => {
    expect(() => buildManifestV3({ ...BASE, name: '' })).toThrow('name 不能为空')
  })
  it('description 空白不输出', () => {
    const out = JSON.parse(buildManifestV3({ ...BASE, description: '   ' }))
    expect(out.description).toBeUndefined()
  })
})

describe('parseManifestConfig', () => {
  it('合法 JSON 解析', () => {
    const o = parseManifestConfig('{"name":"x","version":"1.0","permissions":["tabs"]}')
    expect(o.name).toBe('x')
    expect(o.permissions).toEqual(['tabs'])
    expect(o.hostPermissions).toEqual([])
    expect(o.action).toBeUndefined()
  })
  it('拦截 browser_action', () => {
    expect(() => parseManifestConfig('{"name":"x","browser_action":{}}')).toThrow(
      '检测到 MV2 字段 browser_action/page_action',
    )
  })
  it('拦截 background.persistent', () => {
    expect(() =>
      parseManifestConfig('{"name":"x","background":{"persistent":true}}'),
    ).toThrow('检测到 MV2 字段 background.persistent')
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseManifestConfig('{')).toThrow('配置不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parseManifestConfig('"x"')).toThrow('配置必须是 JSON 对象')
  })
  it('解析 contentScripts 与 action', () => {
    const o = parseManifestConfig(
      '{"name":"x","version":"1","action":{"defaultTitle":"t"},"contentScripts":[{"matches":["https://a/*"],"js":["a.js"],"css":["a.css"],"runAt":"document_idle"}]}',
    )
    expect(o.action?.defaultTitle).toBe('t')
    expect(o.contentScripts?.[0].css).toEqual(['a.css'])
    expect(o.contentScripts?.[0].runAt).toBe('document_idle')
  })
  it('name/version 缺省为空字符串', () => {
    const o = parseManifestConfig('{}')
    expect(o.name).toBe('')
    expect(o.version).toBe('')
    expect(() => buildManifestV3(o)).toThrow('name 不能为空')
  })
  it('action 缺 defaultTitle 时为 undefined', () => {
    const o = parseManifestConfig(
      '{"name":"x","version":"1","action":{"defaultPopup":"p.html"}}',
    )
    expect(o.action?.defaultTitle).toBeUndefined()
    expect(o.action?.defaultPopup).toBe('p.html')
  })
  it('非数组字段缺省为空', () => {
    const o = parseManifestConfig('{"name":"x","version":"1","permissions":"tabs"}')
    expect(o.permissions).toEqual([])
  })
  it('contentScripts 非数组字段缺省', () => {
    const o = parseManifestConfig(
      '{"name":"x","version":"1","contentScripts":[{"matches":"x","js":1}]}',
    )
    expect(o.contentScripts?.[0].matches).toEqual([])
    expect(o.contentScripts?.[0].js).toEqual([])
    expect(o.contentScripts?.[0].css).toBeUndefined()
    expect(o.contentScripts?.[0].runAt).toBeUndefined()
  })
})
