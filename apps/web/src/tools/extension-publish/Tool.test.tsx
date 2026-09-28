// @vitest-environment jsdom
/**
 * extension-publish 组件测试（#784）：发布前检查。
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

describe('extension-publish · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('extpublish-run')).toBeTruthy()
    expect(byTestId('extpublish-store')).toBeTruthy()
    expect(byTestId('extpublish-files')).toBeTruthy()
    expect(byTestId('extpublish-extra')).toBeTruthy()
  })

  it('默认输入检查全部通过', () => {
    render(<Tool />)
    fireEvent.click(byTestId('extpublish-run'))
    expect(byTestId('extpublish-output').textContent).toContain('全部通过')
  })

  it('切换到 Firefox 仍可检查', () => {
    render(<Tool />)
    fireEvent.change(byTestId('extpublish-store'), { target: { value: 'firefox' } })
    fireEvent.click(byTestId('extpublish-run'))
    expect(byTestId('extpublish-output').textContent).toContain('Firefox Add-ons')
  })

  it('附加信息非法显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('extpublish-extra'), { target: { value: '{bad' } })
    fireEvent.click(byTestId('extpublish-run'))
    expect(byTestId('extpublish-error').textContent).toContain('不是合法 JSON')
  })

  it('文件缺失时报未通过', () => {
    render(<Tool />)
    fireEvent.change(byTestId('extpublish-files'), { target: { value: '' } })
    fireEvent.click(byTestId('extpublish-run'))
    expect(byTestId('extpublish-output').textContent).toContain('[未通过]')
  })
})
