// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`missing data-testid=${id}`)
  return el as HTMLElement
}

const ok200 = () => Promise.resolve(new Response('', { status: 200 }))

describe('dead-link · Tool', () => {
  it('示例 → 开始检测 → 输出汇总', async () => {
    vi.stubGlobal('fetch', vi.fn(ok200))
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('check'))
    expect(await screen.findByTestId('summary')).toBeTruthy()
    expect(byTestId('summary').textContent).toContain('共 3 个')
    expect(byTestId('summary').textContent).toContain('无效 1')
  })

  it('无效输入显示错误', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('check'))
    expect(await screen.findByTestId('error')).toBeTruthy()
    expect(byTestId('error').textContent).toContain('每行一个')
  })

  it('检测中按钮禁用', async () => {
    let release!: (v: Response) => void
    const gate = new Promise<Response>((res) => {
      release = res
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => gate),
    )
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('check'))
    expect((byTestId('check') as HTMLButtonElement).disabled).toBe(true)
    release(new Response('', { status: 200 }))
    expect(await screen.findByTestId('summary')).toBeTruthy()
  })

  it('死链被标记并支持仅看死链', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(new Response('', { status: String(url).includes('b.com') ? 200 : 404 })),
      ),
    )
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://a.com/\nhttps://b.com/' } })
    fireEvent.click(byTestId('check'))
    expect(await screen.findByTestId('result-list')).toBeTruthy()
    expect(byTestId('result-list').textContent).toContain('死链')
    fireEvent.click(byTestId('only-dead'))
    expect(byTestId('result-list').textContent).not.toContain('https://b.com/')
    expect(byTestId('result-list').textContent).toContain('https://a.com/')
  })

  it('复制按钮可用', async () => {
    render(<Tool />)
    expect(byTestId('copy')).toBeTruthy()
  })
})
