// @vitest-environment jsdom
/**
 * 首页（Landing Page）组件测试
 * 沿用 json-formatter/Tool.test.tsx 的写法：单文件声明 jsdom，显式 cleanup。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CATEGORIES, GROUPS, PLANNED_TOTAL_TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { HomePage } from './HomePage'

afterEach(cleanup)

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage（Landing Page）', () => {
  it('主视觉区渲染标题、副标题与两个行动按钮', () => {
    renderHome()
    const hero = screen.getByTestId('hero')
    expect(hero).toBeTruthy()
    expect(hero.querySelector('h1')?.textContent).toContain(String(PLANNED_TOTAL_TOOLS))

    expect(screen.getByTestId('hero-cta-primary').getAttribute('href')).toBe('/tools')
    expect(screen.getByTestId('hero-cta-secondary').getAttribute('href')).toBe(
      '/tools/json-formatter',
    )
  })

  it('主视觉含占位图', () => {
    renderHome()
    const img = screen.getByAltText('产品主视觉占位图') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/images/hero-placeholder.svg')
  })

  it('亮点区渲染 4 条核心价值', () => {
    renderHome()
    const section = screen.getByTestId('highlights')
    expect(section.querySelectorAll('h3')).toHaveLength(4)
  })

  it('大组展示覆盖 4 个大组', () => {
    renderHome()
    const section = screen.getByTestId('group-showcase')
    expect(section.querySelectorAll('a')).toHaveLength(GROUPS.length)
  })

  it('分类网格覆盖全部 20 个域', () => {
    renderHome()
    const section = screen.getByTestId('category-grid')
    expect(section.querySelectorAll('a')).toHaveLength(CATEGORIES.length + 1) // +1 为「查看全部」
  })

  it('已上线工具区显示阶段进度', () => {
    renderHome()
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe(
      String(Math.round((TOOL_COUNT / PLANNED_TOTAL_TOOLS) * 100)),
    )
  })

  it('底部转化区存在引导入口', () => {
    renderHome()
    const cta = screen.getByTestId('cta')
    expect(cta.querySelectorAll('a')).toHaveLength(2)
  })
})
