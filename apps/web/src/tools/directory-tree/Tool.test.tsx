// @vitest-environment jsdom
/**
 * directory-tree 组件测试
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const clicked: Array<{ url: string; filename: string }> = []

URL.createObjectURL = ((_blob: Blob) => 'blob:fake') as typeof URL.createObjectURL
URL.revokeObjectURL = ((_url: string) => {}) as typeof URL.revokeObjectURL
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  clicked.push({ url: this.href, filename: this.download })
}

beforeEach(() => {
  clicked.length = 0
})

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('directory-tree · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('webkitdirectory 属性被设置到文件入口', () => {
    render(<Tool />)
    expect(byTestId('file').getAttribute('webkitdirectory')).not.toBeNull()
  })

  it('示例 → 运行 → 输出树形文本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('目录树：')
    expect(output()).toContain('├── ')
    expect(output()).toContain('demo/')
  })

  it('最大深度截断', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input'), { target: { value: '1' } })
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('…')
    expect(output()).not.toContain('index.ts')
  })

  it('未选文件夹 → 中文提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('所选文件夹为空')
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('下载保存目录树文本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('directory-tree.txt')
  })

  it('清空后回到初始态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('目录树：')
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('选择文件夹后点')
  })
})
