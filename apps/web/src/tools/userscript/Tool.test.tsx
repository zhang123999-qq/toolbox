// @vitest-environment jsdom
/**
 * userscript 组件测试（#773）：油猴脚本模板生成。
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

describe('userscript · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('userscript-run')).toBeTruthy()
  })

  it('示例配置生成用户脚本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('userscript-run'))
    const out = byTestId('userscript-output').textContent ?? ''
    expect(out).toContain('// ==UserScript==')
    expect(out).toContain('示例油猴脚本')
    expect(out).toContain('(function() {')
  })

  it('版本号非法报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '{"name":"n","namespace":"ns","version":"1.0","description":"d","matches":["https://a.com/*"],"grants":[],"runAt":"document-end"}',
      },
    })
    fireEvent.click(byTestId('userscript-run'))
    expect(byTestId('userscript-error').textContent).toContain('必须是 x.y.z')
  })

  it('未知 grant 报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '{"name":"n","namespace":"ns","version":"1.0.0","description":"d","matches":["https://a.com/*"],"grants":["GM_hack"],"runAt":"document-end"}',
      },
    })
    fireEvent.click(byTestId('userscript-run'))
    expect(byTestId('userscript-error').textContent).toContain('未知 grant')
  })

  it('GM_addStyle 生成样式示例代码', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '{"name":"n","namespace":"ns","version":"1.0.0","description":"d","matches":["https://a.com/*"],"grants":["GM_addStyle"],"runAt":"document-start"}',
      },
    })
    fireEvent.click(byTestId('userscript-run'))
    expect(byTestId('userscript-output').textContent).toContain('GM_addStyle')
  })
})
