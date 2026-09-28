// @vitest-environment jsdom
/**
 * ocr-post 组件测试：纯本地规则，无需 mock。
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

describe('ocr-post · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 OCR 文本 → 自动纠错并显示改动数', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'Ｔｅｓｔ\n你 好' } })
    expect(byTestId('fixed-text').textContent).toBe('Test 你好')
    expect(byTestId('changes-count').textContent).toContain('共改动')
  })

  it('示例按钮 → 纠错示例文本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const fixed = byTestId('fixed-text').textContent ?? ''
    expect(fixed).toContain('This is a test')
    expect(fixed).toContain('你好，世界')
  })

  it('关闭全部规则 → 文本不变、改动为 0', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'Ｔｅｓｔ' } })
    for (const name of ['形近字纠错', '多余空白清理', '多余换行合并', '全半角统一']) {
      fireEvent.click(screen.getByRole('checkbox', { name }))
    }
    expect(byTestId('fixed-text').textContent).toBe('Ｔｅｓｔ')
    expect(byTestId('changes-count').textContent).toContain('未启用任何规则')
  })

  it('单独关闭形近字规则 → h0me 不再纠正', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'h0me' } })
    expect(byTestId('fixed-text').textContent).toBe('hOme')
    fireEvent.click(screen.getByRole('checkbox', { name: '形近字纠错' }))
    expect(byTestId('fixed-text').textContent).toBe('h0me')
  })

  it('空输入 → 提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('粘贴 OCR')
  })
})
