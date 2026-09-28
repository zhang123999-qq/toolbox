/**
 * userscript-debug（#785）utils 单测：油猴脚本扫描。
 */
import { describe, expect, it } from 'vitest'
import { renderUserscriptIssues, scanUserscript } from './utils'

const GOOD = `// ==UserScript==
// @name         示例脚本
// @version      1.0.0
// @match        https://example.com/*
// @grant        GM_setValue
// ==/UserScript==

GM_setValue('k', 'v');
`

describe('scanUserscript', () => {
  it('合法脚本无问题', () => {
    expect(scanUserscript(GOOD)).toEqual([])
  })
  it('缺少元数据块报 error 并直接返回', () => {
    const issues = scanUserscript('console.log(1)')
    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe('error')
    expect(issues[0].message).toContain('==UserScript==')
  })
  it('元数据块未闭合报 error', () => {
    const issues = scanUserscript('// ==UserScript==\n// @name x\n')
    expect(issues.some((i) => i.message.includes('未闭合'))).toBe(true)
  })
  it('缺少 @name / @version 报 error', () => {
    const issues = scanUserscript('// ==UserScript==\n// ==/UserScript==\n')
    expect(issues.some((i) => i.message.includes('@name'))).toBe(true)
    expect(issues.some((i) => i.message.includes('@version'))).toBe(true)
  })
  it('@version 非 x.y.z 报 warning', () => {
    const code =
      '// ==UserScript==\n// @name x\n// @version 1.0\n// @match <all_urls>\n// ==/UserScript==\n'
    expect(scanUserscript(code).some((i) => i.message.includes('x.y.z'))).toBe(true)
  })
  it('未声明 @match 报 warning', () => {
    const code = '// ==UserScript==\n// @name x\n// @version 1.0.0\n// ==/UserScript==\n'
    expect(scanUserscript(code).some((i) => i.message.includes('@match / @include'))).toBe(true)
  })
  it('非法 @match 报 error，合法写法通过', () => {
    const bad =
      '// ==UserScript==\n// @name x\n// @version 1.0.0\n// @match not-a-url\n// @match https://foo..bar/*\n// ==/UserScript==\n'
    const issues = scanUserscript(bad)
    expect(issues.filter((i) => i.message.includes('非法 @match')).length).toBe(2)
    const ok =
      '// ==UserScript==\n// @name x\n// @version 1.0.0\n// @match *://*.example.com/*\n// @match <all_urls>\n// ==/UserScript==\n'
    expect(scanUserscript(ok).some((i) => i.message.includes('非法 @match'))).toBe(false)
  })
  it('同一元数据键出现多次可解析', () => {
    const code =
      '// ==UserScript==\n// @name x\n// @version 1.0.0\n// @match https://a.com/*\n// @match https://b.com/*\n// ==/UserScript==\n'
    expect(scanUserscript(code)).toEqual([])
  })
  it('元数据块内的普通注释行被忽略', () => {
    const code =
      '// ==UserScript==\n// 这是一行普通注释\n// @name x\n// @version 1.0.0\n// @match *://*/*\n// ==/UserScript==\n'
    expect(scanUserscript(code)).toEqual([])
  })
  it('@grant none 却用 GM_ 函数报 warning', () => {
    const code =
      '// ==UserScript==\n// @name x\n// @version 1.0.0\n// @match <all_urls>\n// @grant none\n// ==/UserScript==\nGM_getValue("k");\n'
    expect(scanUserscript(code).some((i) => i.message.includes('@grant none'))).toBe(true)
  })
  it('未声明的 GM_ 函数逐个报 warning，已声明的不报', () => {
    const code =
      '// ==UserScript==\n// @name x\n// @version 1.0.0\n// @match <all_urls>\n// @grant GM_setValue\n// ==/UserScript==\nGM_setValue("a", 1);\nGM_getValue("a");\nGM_getValue("b");\n'
    const issues = scanUserscript(code)
    expect(issues.filter((i) => i.message.includes('GM_getValue'))).toHaveLength(1)
    expect(issues.some((i) => i.message.includes('GM_setValue'))).toBe(false)
  })
  it('未使用 GM_ 函数不报 grant 相关问题', () => {
    expect(scanUserscript(GOOD).some((i) => i.message.includes('@grant'))).toBe(false)
  })
  it('document.write 与 eval 报 warning 并带行号', () => {
    const code = GOOD + 'document.write("x");\nfoo(eval("1"));\n'
    const issues = scanUserscript(code)
    const dw = issues.find((i) => i.message.includes('document.write'))
    const ev = issues.find((i) => i.message.includes('eval'))
    expect(dw?.line).toBe(9)
    expect(ev?.line).toBe(10)
  })
  it('x.eval 形式不误报', () => {
    const code = GOOD + 'obj.eval("1");\n'
    expect(scanUserscript(code).some((i) => i.message.includes('使用了 eval'))).toBe(false)
  })
})

describe('renderUserscriptIssues', () => {
  it('空列表输出通过结论', () => {
    expect(renderUserscriptIssues([])).toContain('未发现问题')
  })
  it('渲染行号与级别', () => {
    const out = renderUserscriptIssues([
      { line: 3, level: 'error', message: '错' },
      { line: 0, level: 'warning', message: '警' },
    ])
    expect(out).toContain('第 3 行')
    expect(out).toContain('[错误]')
    expect(out).toContain('[警告]')
  })
})
