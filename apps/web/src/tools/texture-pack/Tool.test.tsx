// @vitest-environment jsdom
/**
 * texture-pack 组件测试（#787）：纹理打包。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function stubDownload(): void {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => undefined,
  })
}

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('texture-pack · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('texturepack-pack')).toBeTruthy()
    expect(byTestId('texturepack-json')).toBeTruthy()
    expect(byTestId('texturepack-preview')).toBeTruthy()
  })

  it('计算布局输出图集尺寸与利用率', () => {
    render(<Tool />)
    fireEvent.click(byTestId('texturepack-pack'))
    const out = byTestId('texturepack-output')
    expect(out.textContent).toContain('图集尺寸')
    expect(out.textContent).toContain('利用率')
    expect(out.textContent).toContain('hero')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"rects":[],"maxWidth":128}' } })
    fireEvent.click(byTestId('texturepack-pack'))
    expect(byTestId('texturepack-error').textContent).toContain('不能为空')
  })

  it('预览按钮在计算前禁用、计算后可用', () => {
    render(<Tool />)
    expect((byTestId('texturepack-preview') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(byTestId('texturepack-pack'))
    expect((byTestId('texturepack-preview') as HTMLButtonElement).disabled).toBe(false)
  })

  it('导出 JSON 输出图集元数据', () => {
    stubDownload()
    render(<Tool />)
    fireEvent.click(byTestId('texturepack-json'))
    const out = byTestId('texturepack-output')
    expect(out.textContent).toContain('"frames"')
  })
})
