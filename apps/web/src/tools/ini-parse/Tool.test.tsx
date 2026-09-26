// @vitest-environment jsdom
/**
 * ini-parse 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('ini-parse · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 INI 后输出对应 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a = 1\n[s]\nb = two' } })
    expect(byTestId('output').textContent).toBe('{\n  "a": 1,\n  "s": {\n    "b": "two"\n  }\n}')
  })

  it('非法 INI 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'no-separator-here' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」输出带嵌套小节的 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      [
        '{',
        '  "name": "工具库",',
        '  "port": 8080,',
        '  "debug": false,',
        '  "server": {',
        '    "host": "127.0.0.1",',
        '    "port": 9090,',
        '    "tls": {',
        '      "enabled": true',
        '    }',
        '  }',
        '}',
      ].join('\n'),
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切到 JSON → INI 方向后能把 JSON 还原为 INI', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'json2ini' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1,"s":{"b":2}}' } })
    expect(byTestId('output').textContent).toBe('a = 1\n\n[s]\nb = 2')
  })
})
