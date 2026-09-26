// @vitest-environment jsdom
/**
 * yaml-to-xml 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('yaml-to-xml · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 YAML 后输出 XML 声明与根元素', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a: 1' } })
    expect(byTestId('output').textContent).toBe(
      ['<?xml version="1.0" encoding="UTF-8"?>', '<root>', '  <a>1</a>', '</root>'].join('\n'),
    )
  })

  it('非法 YAML 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a:\n\tb: 1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」输出转换后的 XML', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<root>',
        '  <app>',
        '    <name>工具库</name>',
        '    <port>8080</port>',
        '  </app>',
        '  <tags>yaml</tags>',
        '  <tags>xml</tags>',
        '</root>',
      ].join('\n'),
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切换到四空格缩进后 XML 子元素缩进变宽', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a: 1' } })
    fireEvent.change(screen.getByLabelText('缩进'), { target: { value: '4' } })
    expect(byTestId('output').textContent).toContain('    <a>1</a>')
  })
})
