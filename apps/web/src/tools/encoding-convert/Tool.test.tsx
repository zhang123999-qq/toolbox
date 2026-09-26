// @vitest-environment jsdom
/**
 * encoding-convert 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * jsdom 不自带 TextDecoder/TextEncoder，但 vitest 会把 Node 的实现挂到全局，
 * 因此这里跑的是真实实现而不是桩。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

/** 输出区文本 */
function output(): string {
  return byTestId('output').textContent ?? ''
}

/** 切换 select 控件（按标签文案定位） */
function select(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('encoding-convert · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认配置下把中文编成 GBK 十六进制字节', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toBe('b9a4bedfcfe4')
  })

  it('切到 decode 后由字节还原出中文', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'b9a4bedfcfe4' } })
    select('方向', 'decode')
    expect(output()).toBe('工具箱')
  })

  it('切换字符集与字节写法后立即重算', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    select('格式', 'base64')
    expect(output()).toBe('uaS+38/k')
    select('编码', 'utf-8')
    expect(output()).toBe('5bel5YW3566x')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('字符集里没有的字符进入 role=alert 错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '工具 🚀' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('gbk 里没有这些字符')
  })

  it('字节侧输入非法时给出错误提示', () => {
    render(<Tool />)
    select('方向', 'decode')
    fireEvent.change(byTestId('input'), { target: { value: 'zzz' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('十六进制')
  })
})
