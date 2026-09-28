// @vitest-environment jsdom
/**
 * kv-config 组件测试（#807）：TOML 生成与错误提示。
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

describe('kv-config · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-namespaceId',
      'input-previewId',
      'output',
      'copy',
      'download',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成 kv_namespaces 片段', () => {
    render(<Tool />)
    const toml = byTestId('kv-toml').textContent ?? ''
    expect(toml).toContain('[[kv_namespaces]]')
    expect(toml).toContain('binding = "MY_KV"')
  })

  it('非法绑定名显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'my-kv' } })
    expect(byTestId('kv-error').textContent).toContain('合法 JS 标识符')
  })

  it('非法 ID 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-namespaceId'), { target: { value: 'abc' } })
    expect(byTestId('kv-error').textContent).toContain('32 位十六进制')
  })

  it('填写 preview_id 后输出包含该字段', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-previewId'), {
      target: { value: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    })
    expect(byTestId('kv-toml').textContent).toContain('preview_id')
  })
})
