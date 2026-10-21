// @vitest-environment jsdom
/**
 * SearchDialog 组件测试
 * 覆盖键盘路径：方向键切换高亮时滚动跟随、Tab 焦点圈定在弹窗内不逃到背景页。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SearchDialog } from './SearchDialog'

afterEach(cleanup)

// jsdom 未实现 scrollIntoView：桩一个并记录被滚动到的元素
const scrolled: Element[] = []
Element.prototype.scrollIntoView = function (this: Element) {
  scrolled.push(this)
} as Element['scrollIntoView']

function openAndSearch(query: string) {
  render(
    <MemoryRouter>
      <SearchDialog />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '搜索' }))
  const input = screen.getByTestId('search-input')
  fireEvent.change(input, { target: { value: query } })
  return input
}

function resultButtons() {
  return Array.from(document.querySelectorAll<HTMLElement>('button[data-index]'))
}

describe('SearchDialog', () => {
  it('方向键切换高亮时把高亮项滚进可见区', () => {
    const input = openAndSearch('json')
    expect(resultButtons().length).toBeGreaterThan(2)
    scrolled.length = 0
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(scrolled.at(-1)?.getAttribute('data-index')).toBe('1')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(scrolled.at(-1)?.getAttribute('data-index')).toBe('2')
  })

  it('Tab 焦点在弹窗内循环，不逃到背景页面', () => {
    const input = openAndSearch('json')
    const buttons = resultButtons()
    const last = buttons[buttons.length - 1]
    last.focus()
    expect(document.activeElement).toBe(last)
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
