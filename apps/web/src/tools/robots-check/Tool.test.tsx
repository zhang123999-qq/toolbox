// @vitest-environment jsdom
/**
 * robots-check 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('robots-check · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入显示提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('粘贴 robots.txt')
  })

  it('示例填入后实时显示分组与问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('分组 1')
    expect(text).toContain('全站')
    expect(text).toContain('Sitemap')
  })

  it('规范输入显示无问题结论', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/s.xml' },
    })
    expect(byTestId('output').textContent).toContain('符合规范')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
