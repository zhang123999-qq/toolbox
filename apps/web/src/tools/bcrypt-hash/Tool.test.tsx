// @vitest-environment jsdom
/**
 * bcrypt-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('bcrypt-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('待校验哈希有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-hash')).toBeTruthy()
  })

  it('示例 → 运行 → 输出 bcrypt 哈希', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^\$2[aby]\$08\$[./A-Za-z0-9]{53}$/), {
      timeout: 20000,
    })
  })

  it('哈希后再切到校验方向 → 校验通过', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^\$2[aby]\$/), { timeout: 20000 })
    const hashed = output()

    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'verify' } })
    fireEvent.change(byTestId('input-hash'), { target: { value: hashed } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('校验通过'), { timeout: 20000 })
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('校验方向哈希串非法时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'password' } })
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'verify' } })
    fireEvent.change(byTestId('input-hash'), { target: { value: 'not-a-hash' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 20000,
    })
  })
})
