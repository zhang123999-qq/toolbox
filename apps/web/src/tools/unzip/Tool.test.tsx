// @vitest-environment jsdom
/**
 * unzip 组件测试
 *
 * 下载走 URL.createObjectURL 打桩；构造一个真实 zip（fflate 纯 JS，jsdom 可跑）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { zipSync } from 'fflate'
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

function makeZipFile(): File {
  const enc = new TextEncoder()
  const zip = zipSync({ 'a.txt': enc.encode('hello'), 'dir/b.txt': enc.encode('world') })
  return new File([zip], 'pack.zip', { type: 'application/zip' })
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('unzip · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('上传 zip → 输出清单并出现下载面板', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeZipFile()] } })
    await waitFor(() => expect(output()).toContain('压缩包：pack.zip'), { timeout: 10000 })
    expect(output()).toContain('共 2 个文件')
    expect(byTestId('entry-list').textContent).toContain('a.txt')
    expect(byTestId('entry-list').textContent).toContain('dir/b.txt')
    expect(byTestId('download-all')).toBeTruthy()
  })

  it('点单文件「下载」触发对应文件名下载', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeZipFile()] } })
    await waitFor(() => expect(byTestId('entry-list')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('download-entry-a.txt'))
    expect(clicked.map((c) => c.filename)).toContain('a.txt')
  })

  it('「全部打包下载」生成 extracted zip', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeZipFile()] } })
    await waitFor(() => expect(byTestId('entry-list')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('download-all'))
    expect(clicked.map((c) => c.filename)).toContain('pack-extracted.zip')
  })

  it('上传损坏文件 → 中文报错', async () => {
    render(<Tool />)
    const bad = new File([new TextEncoder().encode('not a zip')], 'bad.zip')
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(output()).toContain('不是有效的 ZIP 文件'), { timeout: 10000 })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('空 zip → 提示压缩包为空', async () => {
    render(<Tool />)
    const empty = new File([zipSync({})], 'empty.zip')
    fireEvent.change(byTestId('file'), { target: { files: [empty] } })
    await waitFor(() => expect(output()).toContain('压缩包为空'), { timeout: 10000 })
  })
})
