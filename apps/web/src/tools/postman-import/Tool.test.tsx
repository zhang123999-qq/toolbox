// @vitest-environment jsdom
/**
 * postman-import 组件测试（#751）：Collection 解析与断言任务导出。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('postman-import · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['collection-summary', 'request-list', 'request-detail', 'assert-task']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认示例解析出 2 个请求', () => {
    render(<Tool />)
    expect(byTestId('collection-summary').textContent).toContain('共 2 个请求')
    expect(byTestId('request-detail').textContent).toContain('api.example.com')
  })

  it('切换请求更新详情', () => {
    render(<Tool />)
    fireEvent.change(byTestId('request-list'), { target: { value: '1' } })
    expect(byTestId('request-detail').textContent).toContain('[POST]')
  })

  it('导出断言任务 JSON 含 #748 字段', () => {
    render(<Tool />)
    const task = JSON.parse(byTestId('assert-task').textContent ?? '{}')
    expect(task.url).toContain('api.example.com')
    expect(task.assertions[0].type).toBe('statusRange')
  })

  it('非法 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    expect(byTestId('parse-error').textContent).toContain('不是合法的 Postman Collection JSON')
    expect(screen.queryByTestId('request-list')).toBeNull()
  })

  it('非 v2.1 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"info":{},"item":[]}' } })
    expect(byTestId('parse-error').textContent).toContain('info.schema 不匹配')
  })
})
