/**
 * devtools（#782）utils 单测：DevTools 面板模板生成与 manifest 校验。
 */
import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_DEVTOOLS,
  generateDevtoolsPage,
  parseDevtoolsInput,
  renderDevtoolsFiles,
  validateDevtoolsManifest,
} from './utils'

describe('parseDevtoolsInput', () => {
  it('解析合法输入与默认值', () => {
    expect(parseDevtoolsInput('{"panelTitle":"测试"}')).toEqual({ panelTitle: '测试', sidebar: false })
    expect(parseDevtoolsInput('{"panelTitle":"  两边空格  ","sidebar":true}')).toEqual({
      panelTitle: '两边空格',
      sidebar: true,
    })
  })
  it('非法 JSON 报错', () => {
    expect(() => parseDevtoolsInput('{bad')).toThrow('不是合法 JSON')
  })
  it('非对象报错', () => {
    expect(() => parseDevtoolsInput('[1,2]')).toThrow('必须是 JSON 对象')
    expect(() => parseDevtoolsInput('null')).toThrow('必须是 JSON 对象')
  })
  it('panelTitle 缺失或为空报错', () => {
    expect(() => parseDevtoolsInput('{}')).toThrow('panelTitle 不能为空')
    expect(() => parseDevtoolsInput('{"panelTitle":"   "}')).toThrow('panelTitle 不能为空')
    expect(() => parseDevtoolsInput('{"panelTitle":123}')).toThrow('panelTitle 不能为空')
  })
  it('sidebar 非布尔报错', () => {
    expect(() => parseDevtoolsInput('{"panelTitle":"a","sidebar":"yes"}')).toThrow('必须为布尔值')
  })
  it('示例输入可解析', () => {
    expect(parseDevtoolsInput(JSON.stringify(EXAMPLE_DEVTOOLS)).panelTitle).toBe('我的面板')
  })
})

describe('generateDevtoolsPage', () => {
  it('生成三个文件且标题正确转义', () => {
    const files = generateDevtoolsPage({ panelTitle: 'A<B>&"面板"' })
    expect(files['devtools.html']).toContain('devtools.js')
    expect(files['panel.html']).toContain('A&lt;B&gt;&amp;&quot;面板&quot;')
    expect(files['panel.html']).toContain('panel.js')
    expect(files['panel.js']).toContain('chrome.devtools.panels.create')
  })
  it('sidebar 为 true 时生成侧边栏代码', () => {
    const files = generateDevtoolsPage({ panelTitle: '面板', sidebar: true })
    expect(files['panel.js']).toContain('createSidebarPane')
  })
  it('sidebar 为 false 时不生成侧边栏代码', () => {
    const files = generateDevtoolsPage({ panelTitle: '面板' })
    expect(files['panel.js']).not.toContain('createSidebarPane')
  })
  it('标题含单引号时 JS 字符串转义', () => {
    const files = generateDevtoolsPage({ panelTitle: "it's" })
    expect(files['panel.js']).toContain("it\\'s")
  })
})

describe('validateDevtoolsManifest', () => {
  it('合法 manifest 通过', () => {
    expect(
      validateDevtoolsManifest('{"manifest_version":3,"devtools_page":"devtools.html"}'),
    ).toEqual([])
  })
  it('非法 JSON 报错', () => {
    expect(validateDevtoolsManifest('{oops')).toEqual(['manifest.json 不是合法 JSON'])
  })
  it('非对象报错', () => {
    expect(validateDevtoolsManifest('[]')).toEqual(['manifest.json 根节点必须是对象'])
  })
  it('manifest_version 非 3 报错', () => {
    const issues = validateDevtoolsManifest('{"manifest_version":2,"devtools_page":"d.html"}')
    expect(issues.some((i) => i.includes('manifest_version'))).toBe(true)
  })
  it('缺少 devtools_page 报错', () => {
    const issues = validateDevtoolsManifest('{"manifest_version":3}')
    expect(issues.some((i) => i.includes('devtools_page'))).toBe(true)
  })
  it('devtools_page 非 html 报错', () => {
    const issues = validateDevtoolsManifest('{"manifest_version":3,"devtools_page":"devtools.js"}')
    expect(issues.some((i) => i.includes('.html'))).toBe(true)
  })
})

describe('renderDevtoolsFiles', () => {
  it('拼接三个文件并带分隔标题', () => {
    const out = renderDevtoolsFiles(generateDevtoolsPage({ panelTitle: '面板' }))
    expect(out).toContain('===== devtools.html =====')
    expect(out).toContain('===== panel.html =====')
    expect(out).toContain('===== panel.js =====')
  })
})
