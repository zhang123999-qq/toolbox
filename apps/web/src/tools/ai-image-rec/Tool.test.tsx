// @vitest-environment jsdom
/**
 * ai-image-gen 组件测试：fetch 全部 mock；FileReader 用真实 File。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)
beforeEach(() => {
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function pngFile(): File {
  return new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' })
}

function txtFile(): File {
  return new File(['hello'], 'a.txt', { type: 'text/plain' })
}

/** model-bad 返回 401，其余返回识别文本 */
function mockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { model: string }
      if (body.model === 'model-bad') {
        return { ok: false, status: 401, text: async () => 'bad key' } as Response
      }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '图里有一只猫' } }] }),
      } as Response
    }),
  )
}

function chooseImage(f: File): void {
  fireEvent.change(byTestId('image-file'), { target: { files: [f] } })
}

describe('ai-image-rec · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('配置输入框存在且 Key 为密码框', () => {
    render(<Tool />)
    for (const id of ['base-url', 'model', 'api-key', 'image-file', 'recognize']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('api-key') as HTMLInputElement).getAttribute('type')).toBe('password')
  })

  it('选择图片 → 显示预览', async () => {
    render(<Tool />)
    chooseImage(pngFile())
    await waitFor(() => expect(byTestId('preview')).toBeTruthy(), { timeout: 10000 })
  })

  it('选择非图片 → 中文错误提示', async () => {
    render(<Tool />)
    chooseImage(txtFile())
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('请选择图片文件')
  })

  it('未选图片点识别 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('recognize'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('请先选择一张图片')
  })

  it('识别成功 → 展示描述文本', async () => {
    mockFetch()
    render(<Tool />)
    chooseImage(pngFile())
    fireEvent.change(byTestId('input'), { target: { value: '图里有什么？' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('recognize'))
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result').textContent).toContain('图里有一只猫')
  })

  it('401 → 中文错误提示', async () => {
    mockFetch()
    render(<Tool />)
    chooseImage(pngFile())
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.change(byTestId('model'), { target: { value: 'model-bad' } })
    fireEvent.click(byTestId('recognize'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    chooseImage(pngFile())
    fireEvent.click(byTestId('recognize'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })
})
