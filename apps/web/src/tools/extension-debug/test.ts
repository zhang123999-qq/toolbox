/**
 * extension-debug（#783）utils 单测：扩展问题诊断。
 */
import { describe, expect, it } from 'vitest'
import { diagnoseExtension, renderDebugIssues } from './utils'

const GOOD = JSON.stringify({
  manifest_version: 3,
  name: '示例',
  version: '1.0.0',
  background: { service_worker: 'bg.js' },
  icons: { '128': 'icon128.png' },
  permissions: ['storage'],
  host_permissions: ['https://api.example.com/*'],
})

describe('diagnoseExtension', () => {
  it('合法 manifest 无问题', () => {
    expect(diagnoseExtension(GOOD, ['bg.js', 'icon128.png'])).toEqual([])
  })
  it('非法 JSON 报 error', () => {
    const issues = diagnoseExtension('{bad', [])
    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe('error')
    expect(issues[0].fix).toContain('JSON')
  })
  it('根节点非对象报 error', () => {
    const issues = diagnoseExtension('[1]', [])
    expect(issues[0].message).toContain('根节点必须是对象')
  })
  it('manifest_version 非 3 报 error', () => {
    const issues = diagnoseExtension(
      JSON.stringify({ manifest_version: 2, name: 'a', version: '1' }),
      [],
    )
    expect(issues.some((i) => i.level === 'error' && i.message.includes('manifest_version'))).toBe(
      true,
    )
  })
  it('残留 MV2 顶层字段报 error', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        browser_action: {},
        page_action: {},
      }),
      [],
    )
    expect(issues.filter((i) => i.message.includes('browser_action'))).toHaveLength(1)
    expect(issues.filter((i) => i.message.includes('page_action'))).toHaveLength(1)
  })
  it('字符串形式 CSP 报 error', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        content_security_policy: "script-src 'self'",
      }),
      [],
    )
    expect(issues.some((i) => i.message.includes('content_security_policy'))).toBe(true)
  })
  it('background.scripts 与 persistent 报 error', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        background: { scripts: ['bg.js'], persistent: true },
      }),
      ['bg.js'],
    )
    expect(issues.some((i) => i.message.includes('background.scripts'))).toBe(true)
    expect(issues.some((i) => i.message.includes('persistent'))).toBe(true)
  })
  it('service_worker 文件缺失报 warning', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        background: { service_worker: 'bg.js' },
      }),
      [],
    )
    expect(issues.some((i) => i.level === 'warning' && i.message.includes('bg.js'))).toBe(true)
  })
  it('background 无 service_worker 报 warning', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        background: { type: 'module' },
      }),
      [],
    )
    expect(issues.some((i) => i.message.includes('未声明 service_worker'))).toBe(true)
  })
  it('未声明 background 报 info', () => {
    const issues = diagnoseExtension(
      JSON.stringify({ manifest_version: 3, name: 'a', version: '1' }),
      [],
    )
    expect(issues.some((i) => i.level === 'info' && i.message.includes('background'))).toBe(true)
  })
  it('图标文件缺失报 warning，未声明 icons 报 info', () => {
    const missing = diagnoseExtension(
      JSON.stringify({ manifest_version: 3, name: 'a', version: '1', icons: { '128': 'i.png' } }),
      [],
    )
    expect(missing.some((i) => i.message.includes('图标 128px'))).toBe(true)
    const none = diagnoseExtension(
      JSON.stringify({ manifest_version: 3, name: 'a', version: '1' }),
      [],
    )
    expect(none.some((i) => i.message.includes('icons'))).toBe(true)
  })
  it('宽泛 host_permissions 报 warning', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        host_permissions: ['<all_urls>'],
      }),
      [],
    )
    expect(issues.some((i) => i.message.includes('过于宽泛'))).toBe(true)
  })
  it('权限过多给最小权限提示', () => {
    const issues = diagnoseExtension(
      JSON.stringify({
        manifest_version: 3,
        name: 'a',
        version: '1',
        permissions: ['a', 'b', 'c', 'd', 'e', 'f'],
      }),
      [],
    )
    expect(issues.some((i) => i.message.includes('最小权限'))).toBe(true)
  })
  it('缺少 name/version 报 error', () => {
    const issues = diagnoseExtension(JSON.stringify({ manifest_version: 3 }), [])
    expect(issues.some((i) => i.message.includes('name'))).toBe(true)
    expect(issues.some((i) => i.message.includes('version'))).toBe(true)
  })
  it('permissions 非数组被忽略', () => {
    const issues = diagnoseExtension(
      JSON.stringify({ manifest_version: 3, name: 'a', version: '1', permissions: 'storage' }),
      [],
    )
    expect(issues.some((i) => i.message.includes('最小权限'))).toBe(false)
  })
})

describe('renderDebugIssues', () => {
  it('空问题列表输出通过结论', () => {
    expect(renderDebugIssues([])).toContain('未发现问题')
  })
  it('渲染级别标签与修复建议', () => {
    const out = renderDebugIssues([
      { level: 'error', message: '错', fix: '修' },
      { level: 'warning', message: '警', fix: '改' },
      { level: 'info', message: '示', fix: '看' },
    ])
    expect(out).toContain('[错误]')
    expect(out).toContain('[警告]')
    expect(out).toContain('[提示]')
    expect(out).toContain('修复：修')
  })
})
