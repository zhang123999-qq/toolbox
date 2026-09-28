// @vitest-environment jsdom
/**
 * embedding-vis 组件测试：echarts 用 SVG 渲染器，jsdom 可挂载。
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

describe('embedding-vis · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入多行 → 渲染散点图与点数说明', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '水果：苹果香蕉\n交通：汽车火车\n动物：猫狗' },
    })
    expect(byTestId('chart')).toBeTruthy()
    expect(byTestId('points-info').textContent).toContain('共 3 个点')
  })

  it('示例按钮 → 自动生成散点图', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('chart')).toBeTruthy()
    expect(byTestId('points-info').textContent).toContain('共 5 个点')
  })

  it('冒号后无内容 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '标签：' } })
    expect(byTestId('error').textContent).toContain('冒号后没有文本内容')
  })

  it('空输入 → 提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('每行输入一条')
  })
})
