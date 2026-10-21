// @vitest-environment jsdom
/**
 * ToolErrorBoundary 组件测试
 * 验证：正常渲染不干预；子组件抛错时只降级为兜底内容，边界外的内容不受影响。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ToolErrorBoundary } from './ToolErrorBoundary'

afterEach(cleanup)

function Boom(): never {
  throw new Error('boom')
}

describe('ToolErrorBoundary', () => {
  it('子组件正常时原样渲染', () => {
    render(
      <ToolErrorBoundary fallback={<p>出错了</p>}>
        <p>正常内容</p>
      </ToolErrorBoundary>,
    )
    expect(screen.getByText('正常内容')).toBeTruthy()
  })

  it('子组件抛错时渲染兜底，边界外内容不受影响', () => {
    // React 会把捕获的错误打到 console.error，测试里静音
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <div>
        <span>页面其余部分</span>
        <ToolErrorBoundary fallback={<p role="alert">出错了</p>}>
          <Boom />
        </ToolErrorBoundary>
      </div>,
    )
    expect(screen.getByText('出错了')).toBeTruthy()
    expect(screen.getByText('页面其余部分')).toBeTruthy()
    spy.mockRestore()
  })
})
