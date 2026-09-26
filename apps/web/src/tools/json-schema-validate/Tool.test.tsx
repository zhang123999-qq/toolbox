// @vitest-environment jsdom
/**
 * json-schema-validate 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

const SIMPLE_SCHEMA = '{"type":"object","required":["id"],"properties":{"id":{"type":"integer"}}}'

describe('json-schema-validate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('数据符合 Schema 时输出通过结论', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"id":1}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: SIMPLE_SCHEMA } })
    expect(byTestId('output').textContent).toBe('校验通过：符合 Schema 要求')
  })

  it('数据不符合时按路径列出问题', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"id":"x"}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: SIMPLE_SCHEMA } })
    expect(byTestId('output').textContent).toContain('$.id：类型不匹配，期望 integer，实际 string')
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"id":1}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '{' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」直接校验并通过', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('校验通过：符合 Schema 要求')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('mode 切到 first 后只显示第一条问题', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"name":1}' } })
    fireEvent.change(byTestId('input-textB'), {
      target: {
        value: '{"type":"object","required":["id"],"properties":{"name":{"type":"string"}}}',
      },
    })
    expect(byTestId('output').textContent).toContain('共 2 处')

    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'first' } })

    expect(byTestId('output').textContent).toContain('仅显示第 1 处')
    expect(byTestId('output').textContent?.split('\n')).toHaveLength(2)
  })
})
