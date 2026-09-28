// @vitest-environment jsdom
/**
 * favicon-gen 组件测试（#628）
 *
 * 说明：canvas / 图片解码是浏览器能力，jsdom 不支持；
 * 此处只测渲染、文件类型校验与清空逻辑，canvas 管线由 utils 的纯函数覆盖。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

/** 构造一个待选文件 */
function pickFile(name: string, type: string): void {
  const file = new File(['dummy'], name, { type })
  const input = byTestId('input') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('favicon-gen · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择非图片文件时中文错误提示', async () => {
    render(<Tool />)
    pickFile('a.txt', 'text/plain')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('请选择图片文件')
  })

  it('错误后点击「清空」恢复初始状态', async () => {
    render(<Tool />)
    pickFile('a.txt', 'text/plain')
    await screen.findByRole('alert')
    fireEvent.click(byTestId('clear'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('选择图片后自动生成')
  })

  it('空输出时提示选择图片', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('选择图片后自动生成')
  })

  it('文件选择框只接受图片', () => {
    render(<Tool />)
    expect(byTestId('input').getAttribute('accept')).toBe('image/*')
  })
})
