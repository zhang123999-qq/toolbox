// @vitest-environment jsdom
/**
 * graphql-test 组件测试（#752）：查询发送与 data/errors 分开展示（fetch 全 mock）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { INTROSPECTION_QUERY } from './utils'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function stubFetch(text: string, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, status, text: async () => text })),
  )
}

describe('graphql-test · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['gql-query', 'gql-variables', 'gql-headers', 'gql-send', 'gql-introspect']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('内省按钮填入标准内省查询', () => {
    render(<Tool />)
    fireEvent.click(byTestId('gql-introspect'))
    expect((byTestId('gql-query') as HTMLTextAreaElement).value).toBe(INTROSPECTION_QUERY)
  })

  it('发送成功展示 data', async () => {
    stubFetch('{"data":{"__typename":"Query"}}')
    render(<Tool />)
    fireEvent.click(byTestId('gql-send'))
    const result = await screen.findByTestId('gql-result')
    expect(result.textContent).toContain('成功')
    expect(byTestId('gql-data').textContent).toContain('Query')
    expect(screen.queryByTestId('gql-errors')).toBeNull()
  })

  it('GraphQL errors 单独展示', async () => {
    stubFetch('{"errors":[{"message":"bad query"}],"data":null}')
    render(<Tool />)
    fireEvent.click(byTestId('gql-send'))
    await screen.findByTestId('gql-result')
    expect(byTestId('gql-errors').textContent).toContain('bad query')
  })

  it('非法查询显示中文错误', async () => {
    stubFetch('{}')
    render(<Tool />)
    fireEvent.change(byTestId('gql-query'), { target: { value: 'hello world' } })
    fireEvent.click(byTestId('gql-send'))
    const err = await screen.findByTestId('gql-error')
    expect(err.textContent).toContain('缺少 query/mutation/subscription')
  })

  it('网络错误显示 CORS 中文提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    render(<Tool />)
    fireEvent.click(byTestId('gql-send'))
    const result = await screen.findByTestId('gql-result')
    expect(result.textContent).toContain('CORS')
  })
})
