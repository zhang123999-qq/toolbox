// @vitest-environment jsdom
/**
 * sitemap-check 组件测试
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

describe('sitemap-check · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入显示提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('粘贴 sitemap XML')
  })

  it('示例填入后实时显示通过率与问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('%')
    expect(text).toContain('lastmod')
    expect(text).toContain('重复')
  })

  it('规范 XML 显示无问题结论', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url></urlset>',
      },
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
