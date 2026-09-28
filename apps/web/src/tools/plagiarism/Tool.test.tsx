// @vitest-environment jsdom
/**
 * plagiarism 组件测试：纯本地计算，无需 mock 网络。
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

const DOC_A = '人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。机器学习是实现人工智能的重要方法。'
const DOC_B = '人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。深度学习近年来取得了突破性进展。'
const DOC_C = '今天天气很好，适合出去散步。公园里的花开得很漂亮，蝴蝶在花丛中飞舞。'

function fillDocs(a: string, b: string, c = ''): void {
  fireEvent.change(byTestId('input'), { target: { value: a } })
  fireEvent.change(byTestId('input-docB'), { target: { value: b } })
  if (c) fireEvent.change(byTestId('input-docC'), { target: { value: c } })
}

describe('plagiarism · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('文档 B/C 输入框与阈值下拉框存在', () => {
    render(<Tool />)
    expect(byTestId('input-docB')).toBeTruthy()
    expect(byTestId('input-docC')).toBeTruthy()
    // MultiPanel 的 select kind 不带 data-testid，用 label 定位
    expect(screen.getByLabelText('相似度阈值')).toBeTruthy()
    expect(byTestId('check')).toBeTruthy()
  })

  it('两篇相关文档 → 显示评分与相似片段', async () => {
    render(<Tool />)
    fillDocs(DOC_A, DOC_B)
    fireEvent.click(byTestId('check'))
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result').textContent).toContain('文档A × 文档B')
    expect(byTestId('result').textContent).toContain('人工智能是计算机科学的一个分支')
  })

  it('三篇文档 → 三对结果按相似度降序', async () => {
    render(<Tool />)
    fillDocs(DOC_A, DOC_B, DOC_C)
    fireEvent.click(byTestId('check'))
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    const text = byTestId('result').textContent ?? ''
    expect(text).toContain('文档A × 文档B')
    expect(text).toContain('文档A × 文档C')
    expect(text).toContain('文档B × 文档C')
    // A×B 最相关，应排在最前
    expect(text.indexOf('文档A × 文档B')).toBeLessThan(text.indexOf('文档A × 文档C'))
  })

  it('只填一篇 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: DOC_A } })
    fireEvent.click(byTestId('check'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('至少需要两篇')
  })

  it('文档太短 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '太短了' } })
    fireEvent.change(byTestId('input-docB'), { target: { value: DOC_B } })
    fireEvent.click(byTestId('check'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('太短')
  })

  it('无关文档 → 显示无达到阈值的相似片段', async () => {
    render(<Tool />)
    fillDocs(DOC_A, DOC_C)
    fireEvent.click(byTestId('check'))
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result').textContent).toContain('无达到阈值的相似片段')
  })
})
