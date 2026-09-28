// @vitest-environment jsdom
/**
 * manifest-v3 组件测试（#771）：manifest 生成与 MV2 拦截。
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

describe('manifest-v3 · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('manifestv3-run')).toBeTruthy()
  })

  it('示例配置生成 manifest.json', () => {
    render(<Tool />)
    fireEvent.click(byTestId('manifestv3-run'))
    const out = JSON.parse(byTestId('manifestv3-output').textContent ?? '')
    expect(out.manifest_version).toBe(3)
    expect(out.name).toBe('我的扩展')
    expect(out.permissions).toContain('storage')
  })

  it('MV2 browser_action 被拦截', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"name":"x","version":"1.0","browser_action":{}}' },
    })
    fireEvent.click(byTestId('manifestv3-run'))
    expect(byTestId('manifestv3-error').textContent).toContain('MV2')
  })

  it('非法版本号报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"name":"x","version":"v1"}' },
    })
    fireEvent.click(byTestId('manifestv3-run'))
    expect(byTestId('manifestv3-error').textContent).toContain('version 必须是')
  })
})
