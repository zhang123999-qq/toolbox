// @vitest-environment jsdom
/**
 * yaml-formatter 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('yaml-formatter · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入缩进混乱的 YAML 后输出规整结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a:\n    b: 1\n\n\nc: 2' } })
    expect(byTestId('output').textContent).toBe('a:\n  b: 1\nc: 2')
  })

  it('非法 YAML 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a:\n  - 1\n \t- 2' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」填入带注释的 YAML 并保留注释输出', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      '# 应用配置\nname: 工具库\nport: 8080\ndebug: false\ntags:\n  - yaml\n  - format',
    )
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

  it('切换「排序键名」后输出按字典序重排', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'b: 1\na: 2' } })
    expect(byTestId('output').textContent).toBe('b: 1\na: 2')

    fireEvent.click(screen.getByLabelText('排序键名'))

    expect(byTestId('output').textContent).toBe('a: 2\nb: 1')
  })

  it('切到 validate 模式后输出校验报告', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'validate' } })
    fireEvent.change(byTestId('input'), { target: { value: 'a: 1' } })
    expect(byTestId('output').textContent).toContain('✓ YAML 合法')
  })
})
