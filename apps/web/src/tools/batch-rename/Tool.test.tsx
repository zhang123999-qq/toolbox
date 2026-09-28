// @vitest-environment jsdom
/**
 * batch-rename 组件测试
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('batch-rename · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例（加前缀）→ 运行 → 对照表；下载 renamed.zip', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('photo1.jpg → trip_photo1.jpg'), {
      timeout: 10000,
    })
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('renamed.zip')
  })

  it('按序号规则生成带零编号的名字', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-rule'), { target: { value: 'number' } })
    fireEvent.change(byTestId('input'), { target: { value: 'p' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('p001.jpg'), { timeout: 10000 })
  })

  it('查找替换缺参数 → 中文报错', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-rule'), { target: { value: 'replace' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('需要填写查找内容'), { timeout: 10000 })
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('未选文件 → 中文提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('请先选择要重命名的文件'), { timeout: 10000 })
  })

  it('清空后回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('对照表'), { timeout: 10000 })
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('选好文件与规则后点')
  })
})
