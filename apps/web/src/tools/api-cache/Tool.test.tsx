// @vitest-environment jsdom
/**
 * api-cache 组件测试（#761）：缓存决策展示与错误处理。
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

describe('api-cache · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('apicache-run')).toBeTruthy()
  })

  it('示例输入判为新鲜', () => {
    render(<Tool />)
    fireEvent.click(byTestId('apicache-run'))
    expect(byTestId('apicache-decision').textContent).toContain('新鲜')
    expect(byTestId('apicache-reason').textContent).toContain('max-age')
  })

  it('no-store 判为禁止缓存', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"cacheControl":"no-store"}' },
    })
    fireEvent.click(byTestId('apicache-run'))
    expect(byTestId('apicache-decision').textContent).toContain('禁止缓存')
  })

  it('非法 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('apicache-run'))
    expect(byTestId('apicache-error').textContent).toContain('不是合法 JSON')
  })
})
