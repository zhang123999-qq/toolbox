// @vitest-environment jsdom
/**
 * landmark（#733）utils 单测：jsdom 真实 DOMParser + 可注入工厂。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  analyzeLandmarks,
  formatLandmarkReport,
  generateLandmarkHtml,
  type DocFactory,
} from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('parseHtml 空输入', () => {
  it('空输入抛中文错', () => {
    expect(() => analyzeLandmarks('')).toThrow('请输入 HTML')
    expect(() => analyzeLandmarks('   ')).toThrow('请输入 HTML')
  })
  it('可注入自定义工厂', () => {
    const spy = vi.fn(factory)
    analyzeLandmarks('<main>x</main>', spy)
    expect(spy).toHaveBeenCalledWith('<main>x</main>')
  })
  it('默认工厂（不传参）', () => {
    expect(analyzeLandmarks('<main>x</main>').stats.total).toBe(1)
  })
})

describe('地标识别', () => {
  it('识别隐式语义地标', () => {
    const a = analyzeLandmarks(
      '<header>H</header><nav>N</nav><main>M</main><aside>A</aside><footer>F</footer>',
      factory,
    )
    expect(a.stats.total).toBe(5)
    expect(a.stats.byRole).toEqual({
      banner: 1,
      navigation: 1,
      main: 1,
      complementary: 1,
      contentinfo: 1,
    })
    expect(a.issues).toEqual([])
  })
  it('显式 role 优先且不重复计数', () => {
    const a = analyzeLandmarks('<div role="search">搜</div><main role="main">M</main>', factory)
    expect(a.stats.byRole).toEqual({ search: 1, main: 1 })
  })
  it('article 内的 header 不算 banner', () => {
    const a = analyzeLandmarks('<article><header>H</header></article><main>M</main>', factory)
    expect(a.stats.byRole.banner ?? 0).toBe(0)
    expect(a.stats.total).toBe(1)
  })
  it('section 内的 footer/aside 不算顶层地标', () => {
    const a = analyzeLandmarks(
      '<section><footer>F</footer><aside>A</aside></section><main>M</main>',
      factory,
    )
    expect(a.stats.byRole.contentinfo ?? 0).toBe(0)
    expect(a.stats.byRole.complementary ?? 0).toBe(0)
  })
  it('无障碍名称取 aria-label', () => {
    const a = analyzeLandmarks('<nav aria-label="主导航">x</nav><main>M</main>', factory)
    const nav = a.landmarks.find((l) => l.role === 'navigation')
    expect(nav?.named).toBe(true)
    expect(nav?.label).toBe('主导航')
  })
  it('aria-labelledby 显示引用标记', () => {
    const a = analyzeLandmarks('<nav aria-labelledby="t">x</nav><main>M</main>', factory)
    const nav = a.landmarks.find((l) => l.role === 'navigation')
    expect(nav?.named).toBe(true)
    expect(nav?.label).toContain('aria-labelledby')
  })
  it('长名称截断', () => {
    const a = analyzeLandmarks(`<nav aria-label="${'x'.repeat(50)}">x</nav><main>M</main>`, factory)
    const nav = a.landmarks.find((l) => l.role === 'navigation')
    expect(nav?.label.endsWith('…')).toBe(true)
  })
})

describe('地标问题检查', () => {
  it('非地标 role 被忽略', () => {
    const a = analyzeLandmarks('<div role="button">x</div><main>M</main>', factory)
    expect(a.landmarks.length).toBe(1)
    expect(a.landmarks[0]?.role).toBe('main')
  })
  it('缺少 main 报错误', () => {
    const a = analyzeLandmarks('<header>H</header>', factory)
    const issue = a.issues.find((i) => i.message.includes('缺少 main'))
    expect(issue?.severity).toBe('error')
    expect(issue?.suggestion).toContain('<main>')
  })
  it('多个 main 报错误', () => {
    const a = analyzeLandmarks('<main>A</main><main>B</main>', factory)
    expect(a.issues.some((i) => i.message.includes('2 个 main'))).toBe(true)
  })
  it('多个 banner 报警告', () => {
    const a = analyzeLandmarks('<header>A</header><header>B</header><main>M</main>', factory)
    const issue = a.issues.find((i) => i.message.includes('banner'))
    expect(issue?.severity).toBe('warning')
  })
  it('多个 contentinfo 报警告', () => {
    const a = analyzeLandmarks('<footer>A</footer><footer>B</footer><main>M</main>', factory)
    expect(a.issues.some((i) => i.message.includes('contentinfo'))).toBe(true)
  })
  it('多个无名 nav 报警告，有名则不报', () => {
    const bad = analyzeLandmarks('<nav> </nav><nav> </nav><main>M</main>', factory)
    expect(bad.issues.filter((i) => i.message.includes('无法区分')).length).toBe(2)
    const good = analyzeLandmarks(
      '<nav aria-label="主导航">A</nav><nav aria-label="页脚">B</nav><main>M</main>',
      factory,
    )
    expect(good.issues.some((i) => i.message.includes('无法区分'))).toBe(false)
  })
  it('单个无名 nav 不警告', () => {
    const a = analyzeLandmarks('<nav> </nav><main>M</main>', factory)
    expect(a.issues.some((i) => i.message.includes('无法区分'))).toBe(false)
  })
  it('无名 region 报错误', () => {
    const a = analyzeLandmarks('<div role="region">x</div><main>M</main>', factory)
    const issue = a.issues.find((i) => i.message.includes('region'))
    expect(issue?.severity).toBe('error')
    expect(issue?.suggestion).toContain('aria-label')
  })
  it('有名 region 不报错', () => {
    const a = analyzeLandmarks('<div role="region" aria-label="评论区">x</div><main>M</main>', factory)
    expect(a.issues.some((i) => i.message.includes('region'))).toBe(false)
  })
})

describe('generateLandmarkHtml', () => {
  it('骨架含五大地标', () => {
    const s = generateLandmarkHtml()
    expect(s).toContain('<header>')
    expect(s).toContain('<main id="main-content">')
    expect(s).toContain('<aside')
    expect(s).toContain('<footer>')
    expect(s).toContain('aria-label="主导航"')
  })
})

describe('formatLandmarkReport', () => {
  it('报告含地标列表与问题', () => {
    const r = formatLandmarkReport(analyzeLandmarks('<nav> </nav><nav> </nav>', factory))
    expect(r).toContain('地标总数：2')
    expect(r).toContain('navigation')
    expect(r).toContain('（未命名）')
    expect(r).toContain('[错误]')
    expect(r).toContain('缺少 main')
    expect(r).toContain('标准地标骨架：')
  })
  it('无地标时显示（无）', () => {
    const r = formatLandmarkReport(analyzeLandmarks('<p>x</p>', factory))
    expect(r).toContain('（无）')
  })
  it('无问题时显示通过', () => {
    const r = formatLandmarkReport(
      analyzeLandmarks('<header>H</header><main>M</main><footer>F</footer>', factory),
    )
    expect(r).toContain('未发现地标问题 ✓')
  })
  it('已命名地标显示名称', () => {
    const r = formatLandmarkReport(
      analyzeLandmarks('<nav aria-label="主导航">x</nav><main>M</main>', factory),
    )
    expect(r).toContain('"主导航"')
  })
})
