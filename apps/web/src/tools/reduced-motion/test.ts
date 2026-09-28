/**
 * reduced-motion（#736）utils 单测：纯函数，无 DOM 依赖。
 */
import { describe, expect, it } from 'vitest'
import {
  detectAnimations,
  generateReducedMotionCss,
  parseExtraSelectors,
  summarizeFindings,
} from './utils'

describe('parseExtraSelectors', () => {
  it('逗号分隔并去空格', () => {
    expect(parseExtraSelectors('.a, #b > span')).toEqual(['.a', '#b > span'])
  })
  it('空字符串返回空数组', () => {
    expect(parseExtraSelectors('   ')).toEqual([])
  })
  it('非法字符抛中文错', () => {
    expect(() => parseExtraSelectors('.a <script>')).toThrow('额外选择器不合法')
    expect(() => parseExtraSelectors('a&b')).toThrow('不合法')
  })
})

describe('generateReducedMotionCss', () => {
  it('全开生成完整媒体查询', () => {
    const css = generateReducedMotionCss({
      disableAnimations: true,
      disableTransitions: true,
      disableSmoothScroll: true,
      extraSelectors: '',
    })
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms !important;')
    expect(css).toContain('animation-iteration-count: 1 !important;')
    expect(css).toContain('transition-duration: 0.01ms !important;')
    expect(css).toContain('scroll-behavior: auto !important;')
  })
  it('只关动画时不含过渡与滚动规则', () => {
    const css = generateReducedMotionCss({
      disableAnimations: true,
      disableTransitions: false,
      disableSmoothScroll: false,
      extraSelectors: '',
    })
    expect(css).toContain('animation-duration')
    expect(css).not.toContain('transition-duration')
    expect(css).not.toContain('scroll-behavior')
  })
  it('只关平滑滚动时不含通用选择器块', () => {
    const css = generateReducedMotionCss({
      disableAnimations: false,
      disableTransitions: false,
      disableSmoothScroll: true,
      extraSelectors: '',
    })
    expect(css).not.toContain('*, *::before, *::after')
    expect(css).toContain('scroll-behavior: auto !important;')
  })
  it('额外选择器拼入规则', () => {
    const css = generateReducedMotionCss({
      disableAnimations: true,
      disableTransitions: false,
      disableSmoothScroll: false,
      extraSelectors: '.carousel, #hero',
    })
    expect(css).toContain('*, *::before, *::after, .carousel, #hero {')
  })
  it('三项全关抛错', () => {
    expect(() =>
      generateReducedMotionCss({
        disableAnimations: false,
        disableTransitions: false,
        disableSmoothScroll: false,
        extraSelectors: '',
      }),
    ).toThrow('至少开启一项')
  })
  it('非法额外选择器抛错', () => {
    expect(() =>
      generateReducedMotionCss({
        disableAnimations: true,
        disableTransitions: false,
        disableSmoothScroll: false,
        extraSelectors: '<b>',
      }),
    ).toThrow('额外选择器不合法')
  })
})

describe('detectAnimations', () => {
  it('空输入抛错', () => {
    expect(() => detectAnimations('  ')).toThrow('请输入要扫描的 CSS 代码')
  })
  it('检测 @keyframes', () => {
    const f = detectAnimations('@keyframes fade {\n  from { opacity: 0; }\n}')
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ kind: 'keyframes', detail: 'fade', line: 1 })
  })
  it('检测 animation 与 transition 声明', () => {
    const css = '.a {\n  animation: fade 2s ease;\n  transition: color .3s;\n}'
    const f = detectAnimations(css)
    expect(f).toHaveLength(2)
    expect(f[0]).toMatchObject({ kind: 'animation', line: 2 })
    expect(f[0]?.detail).toContain('fade 2s ease')
    expect(f[1]).toMatchObject({ kind: 'transition', line: 3 })
  })
  it('检测 animation-name 长写法', () => {
    const f = detectAnimations('.a { animation-name: slide; }')
    expect(f).toHaveLength(1)
    expect(f[0]?.kind).toBe('animation')
  })
  it('注释中的声明不计入', () => {
    const f = detectAnimations('/* animation: x 1s; */\n.a { color: red; }')
    expect(f).toHaveLength(0)
  })
  it('无动画 CSS 返回空数组', () => {
    expect(detectAnimations('.a { color: red; }')).toEqual([])
  })
  it('结果按行号排序', () => {
    const f = detectAnimations('.a { transition: all .2s; }\n@keyframes k {}')
    expect(f.map((x) => x.line)).toEqual([1, 2])
  })
})

describe('summarizeFindings', () => {
  it('空结果提示未发现', () => {
    expect(summarizeFindings([])).toContain('未发现')
  })
  it('汇总各类数量', () => {
    const s = summarizeFindings([
      { kind: 'keyframes', detail: 'k', line: 1 },
      { kind: 'animation', detail: 'a', line: 2 },
      { kind: 'transition', detail: 't', line: 3 },
    ])
    expect(s).toContain('共发现 3 处')
    expect(s).toContain('@keyframes 1 个')
    expect(s).toContain('animation 1 处')
    expect(s).toContain('transition 1 处')
  })
  it('零计数的类别不出现', () => {
    const s = summarizeFindings([{ kind: 'transition', detail: 't', line: 1 }])
    expect(s).not.toContain('animation')
    expect(s).toContain('transition 1 处')
  })
  it('无 transition 时不出现 transition 计数', () => {
    const s = summarizeFindings([
      { kind: 'keyframes', detail: 'k', line: 1 },
      { kind: 'animation', detail: 'a', line: 2 },
    ])
    expect(s).toContain('共发现 2 处')
    expect(s).not.toContain('transition')
  })
})
