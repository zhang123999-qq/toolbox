// @vitest-environment jsdom
/**
 * rtl 组件测试（#725）：输入文本实时输出分析与三栏预览。
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

describe('rtl · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('三栏预览带 dir 属性', () => {
    render(<Tool />)
    expect(byTestId('preview-rtl').getAttribute('dir')).toBe('rtl')
    expect(byTestId('preview-ltr').getAttribute('dir')).toBe('ltr')
    expect(byTestId('preview-auto').getAttribute('dir')).toBe('auto')
  })

  it('输入混合文本实时输出分析', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'HelloABC مرحبا' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('主导方向：从左到右（LTR）')
    expect(out).toContain('⚠')
    expect(byTestId('preview-rtl').textContent).toBe('HelloABC مرحبا')
  })

  it('点示例填入示例文本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toContain('مرحبا')
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('主导方向')
  })

  it('点运行重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'مرحبا' } })
    fireEvent.click(byTestId('run'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('主导方向：从右到左（RTL）')
  })
})
