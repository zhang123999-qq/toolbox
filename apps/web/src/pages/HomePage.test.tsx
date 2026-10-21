// @vitest-environment jsdom
/**
 * 首页（Landing Page）组件测试
 * 沿用 json-formatter/Tool.test.tsx 的写法：单文件声明 jsdom，显式 cleanup。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  CATEGORIES,
  GROUPS,
  TOOLS,
  TOOL_COUNT,
  categoriesOfGroup,
  toolsOfCategory,
} from '@toolbox/catalog'
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
    expect(hero.querySelector('h1')?.textContent).toContain(String(TOOL_COUNT))

    expect(screen.getByTestId('hero-cta-primary').getAttribute('href')).toBe('/tools')
    expect(screen.getByTestId('hero-cta-secondary').getAttribute('href')).toBe(
      '/tools/json-formatter',
    )
  })

  it('主视觉为实拍截图轮播', () => {
    renderHome()
    const carousel = screen.getByTestId('hero-carousel')
    const imgs = screen.getAllByAltText('网站实拍预览') as HTMLImageElement[]
    expect(imgs).toHaveLength(6)
    expect(imgs[0].getAttribute('src')).toBe('/images/hero/hero-home.webp')
    // 6 个圆点，可手动切换
    expect(carousel.querySelectorAll('button')).toHaveLength(6)
  })

  it('亮点区渲染 4 条核心价值', () => {
    renderHome()
    const section = screen.getByTestId('highlights')
    expect(section.querySelectorAll('h3')).toHaveLength(4)
  })

  it('大组展示覆盖全部大组，并显示实际上线工具数', () => {
    renderHome()
    const section = screen.getByTestId('group-showcase')
    expect(section.querySelectorAll('a')).toHaveLength(GROUPS.length)
    // 卡片数字必须是实际上线数，不是规划数（两者在多数大组不一致）
    const group = GROUPS[0]
    const live = categoriesOfGroup(group.id).reduce(
      (sum, c) => sum + toolsOfCategory(c.id).length,
      0,
    )
    const card = section.querySelector(`a[href="/c/${group.id}"]`)
    expect(card?.textContent).toContain(`${live} 个工具`)
  })

  it('分类网格覆盖全部域，并显示各域实际上线工具数', () => {
    renderHome()
    const section = screen.getByTestId('category-grid')
    expect(section.querySelectorAll('a')).toHaveLength(CATEGORIES.length + 1) // +1 为「查看全部」
    // 挑一个规划数与实际数不一致的域，卡片必须显示实际数
    const target =
      CATEGORIES.find((c) => toolsOfCategory(c.id).length !== c.plannedTools) ?? CATEGORIES[0]
    const card = section.querySelector(`a[href="/c/${target.group}/${target.id}"]`)
    expect(card?.textContent).toContain(`${toolsOfCategory(target.id).length} 个`)
  })

  it('已上线工具区显示总数与每域代表工具、无阶段进度条', () => {
    renderHome()
    const section = screen.getByTestId('featured-tools')
    expect(section.querySelector('[role="progressbar"]')).toBeNull()
    expect(section.textContent).toContain(`共 ${TOOL_COUNT} 个工具`)
    // 首页只渲染每个域的 1 个代表工具，不全量渲染；完整清单走「查看全部」
    const represented = new Set(TOOLS.map((tool) => tool.category)).size
    expect(section.querySelectorAll('a[href^="/tools/"]')).toHaveLength(represented)
    expect(section.querySelector('a[href="/tools"]')).toBeTruthy()
  })

  it('底部转化区存在引导入口', () => {
    renderHome()
    const cta = screen.getByTestId('cta')
    expect(cta.querySelectorAll('a')).toHaveLength(2)
  })
})
