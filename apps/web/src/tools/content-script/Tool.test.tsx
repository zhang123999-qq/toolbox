// @vitest-environment jsdom
/**
 * content-script 组件测试（#772）：content.js 模板生成。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('content-script · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('contentscript-run')).toBeTruthy()
  })

  it('示例配置生成 content.js', () => {
    render(<Tool />)
    fireEvent.click(byTestId('contentscript-run'))
    const out = byTestId('contentscript-output').textContent ?? ''
    expect(out).toContain('chrome.runtime.onMessage.addListener')
    expect(out).toContain('MutationObserver')
    expect(out).toContain('chrome.storage.sync')
  })

  it('非法匹配模式报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"matches":["notaurl"],"runAt":"document_idle","features":[]}' },
    })
    fireEvent.click(byTestId('contentscript-run'))
    expect(byTestId('contentscript-error').textContent).toContain('非法匹配模式')
  })

  it('空 matches 报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"matches":[],"runAt":"document_idle","features":[]}' },
    })
    fireEvent.click(byTestId('contentscript-run'))
    expect(byTestId('contentscript-error').textContent).toContain('至少需要一个')
  })

  it('context-menu 特性生成对应代码块', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '{"matches":["https://a.com/*"],"runAt":"document_start","features":["context-menu"]}',
      },
    })
    fireEvent.click(byTestId('contentscript-run'))
    const out = byTestId('contentscript-output').textContent ?? ''
    expect(out).toContain('contextmenu')
    expect(out).toContain('run_at: document_start')
  })
})
