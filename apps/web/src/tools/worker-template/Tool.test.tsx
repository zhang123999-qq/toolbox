// @vitest-environment jsdom
/**
 * worker-template 组件测试（#806）：模板实时生成与错误提示。
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

describe('worker-template · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-name', 'input-cronSchedule', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  })

  it('默认生成含路由的代码', () => {
    render(<Tool />)
    const code = byTestId('worker-code').textContent ?? ''
    expect(code).toContain('export default {')
    expect(code).toContain('handleRoute0')
    expect(code).toContain('/api/users')
  })

  it('勾选 KV 后 Env 出现绑定', () => {
    render(<Tool />)
    const boxes = screen.getAllByRole('checkbox')
    fireEvent.click(boxes[1])
    expect(byTestId('worker-code').textContent).toContain('MY_KV: KVNamespace')
  })

  it('勾选 Cron 但未填表达式显示中文错误', () => {
    render(<Tool />)
    fireEvent.click(screen.getAllByRole('checkbox')[4])
    expect(byTestId('worker-error').textContent).toContain('必须填写 cron 表达式')
  })

  it('非法路由行显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'BADLINE' } })
    expect(byTestId('worker-error').textContent).toContain('第 1 行路由格式非法')
  })

  it('非法名称显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-name'), { target: { value: 'Bad Name' } })
    expect(byTestId('worker-error').textContent).toContain('只能包含小写字母')
  })
})
