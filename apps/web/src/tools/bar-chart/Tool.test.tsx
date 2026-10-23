// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Tool from './Tool'

describe('bar-chart · Tool', () => {
  it('渲染后必需元素存在', () => {
    render(<Tool />)
    expect(screen.getByTestId('input')).toBeTruthy()
  })

  it('点示例填入数据并渲染 SVG', () => {
    render(<Tool />)
    const btns = screen.getAllByTestId('example')
    expect(btns.length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('output').length).toBeGreaterThan(0)
  })
})
