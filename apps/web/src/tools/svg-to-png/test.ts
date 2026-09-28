import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIZE,
  MAX_DIMENSION,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  assertSvgText,
  buildOutputFileName,
  computeTargetSize,
  errorMessage,
  isSvgFile,
  parseBackgroundColor,
  parseSvgDimensions,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isSvgFile', () => {
  it('MIME 为 image/svg+xml 判定为 SVG', () => {
    const f = new File(['<svg/>'], 'icon.txt', { type: 'image/svg+xml' })
    expect(isSvgFile(f)).toBe(true)
  })

  it('无 MIME 时按 .svg 扩展名判定', () => {
    const f = new File(['<svg/>'], 'icon.svg', { type: '' })
    expect(isSvgFile(f)).toBe(true)
  })

  it('非 SVG 返回 false', () => {
    const f = new File(['x'], 'a.txt', { type: 'text/plain' })
    expect(isSvgFile(f)).toBe(false)
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('assertSvgText', () => {
  it('空文本抛错', () => {
    expect(() => assertSvgText('')).toThrow(/SVG 文本为空/)
    expect(() => assertSvgText('   \n ')).toThrow(/SVG 文本为空/)
  })

  it('缺少 <svg> 标签抛错', () => {
    expect(() => assertSvgText('<html><body>x</body></html>')).toThrow(/未找到 <svg> 标签/)
  })

  it('合法返回去空白文本', () => {
    expect(assertSvgText('  <svg width="1"></svg>\n')).toBe('<svg width="1"></svg>')
  })
})

describe('parseSvgDimensions', () => {
  it('优先解析 width/height 属性', () => {
    expect(parseSvgDimensions('<svg width="200" height="100"></svg>')).toEqual({
      width: 200,
      height: 100,
    })
  })

  it('接受 px 后缀与单引号', () => {
    expect(parseSvgDimensions("<svg width='200px' height='100px'></svg>")).toEqual({
      width: 200,
      height: 100,
    })
  })

  it('百分比/pt 等单位被拒绝，退化到 viewBox', () => {
    expect(
      parseSvgDimensions('<svg width="50%" height="10pt" viewBox="0 0 300 150"></svg>'),
    ).toEqual({ width: 300, height: 150 })
  })

  it('缺一边时退化到 viewBox', () => {
    expect(parseSvgDimensions('<svg width="200" viewBox="0 0 300 150"></svg>')).toEqual({
      width: 300,
      height: 150,
    })
  })

  it('仅 viewBox', () => {
    expect(parseSvgDimensions('<svg viewBox="0 0 300 150"></svg>')).toEqual({
      width: 300,
      height: 150,
    })
  })

  it('viewBox 逗号分隔', () => {
    expect(parseSvgDimensions('<svg viewBox="0,0,300,150"></svg>')).toEqual({
      width: 300,
      height: 150,
    })
  })

  it('viewBox 数量不对或为 0 返回 null', () => {
    expect(parseSvgDimensions('<svg viewBox="0 0 300"></svg>')).toBeNull()
    expect(parseSvgDimensions('<svg viewBox="0 0 0 150"></svg>')).toBeNull()
    expect(parseSvgDimensions('<svg viewBox="0 0 a b"></svg>')).toBeNull()
  })

  it('width 为 0 或无任何尺寸信息返回 null', () => {
    expect(parseSvgDimensions('<svg width="0" height="100"></svg>')).toBeNull()
    expect(parseSvgDimensions('<svg></svg>')).toBeNull()
  })

  it('不误匹配 stroke-width 这类属性', () => {
    // stroke-width 不应被当作 width
    expect(parseSvgDimensions('<svg stroke-width="5" viewBox="0 0 40 20"></svg>')).toEqual({
      width: 40,
      height: 20,
    })
  })
})

describe('computeTargetSize', () => {
  it('宽高都给直接用', () => {
    expect(computeTargetSize({ width: 200, height: 100 }, '300', '150')).toEqual({
      width: 300,
      height: 150,
    })
  })

  it('只给宽度时按比例缩放高度', () => {
    expect(computeTargetSize({ width: 200, height: 100 }, '100', '')).toEqual({
      width: 100,
      height: 50,
    })
  })

  it('只给高度时按比例缩放宽度', () => {
    expect(computeTargetSize({ width: 200, height: 100 }, '', '50')).toEqual({
      width: 100,
      height: 50,
    })
  })

  it('自然尺寸未知时只给一边取正方形', () => {
    expect(computeTargetSize(null, '100', '')).toEqual({ width: 100, height: 100 })
    expect(computeTargetSize(null, '', '80')).toEqual({ width: 80, height: 80 })
  })

  it('都不给时用自然尺寸', () => {
    expect(computeTargetSize({ width: 200, height: 100 }, '', '')).toEqual({
      width: 200,
      height: 100,
    })
  })

  it('自然尺寸未知且都不给时默认 512', () => {
    expect(computeTargetSize(null, '', '')).toEqual({ width: DEFAULT_SIZE, height: DEFAULT_SIZE })
    expect(computeTargetSize({ width: 0, height: 0 }, '', '')).toEqual({
      width: DEFAULT_SIZE,
      height: DEFAULT_SIZE,
    })
  })

  it('输入带空白可解析', () => {
    expect(computeTargetSize({ width: 200, height: 100 }, ' 100 ', '')).toEqual({
      width: 100,
      height: 50,
    })
  })

  it('非法输入抛错', () => {
    expect(() => computeTargetSize(null, 'abc', '')).toThrow(/宽度无效/)
    expect(() => computeTargetSize(null, '', '1.5')).toThrow(/高度无效/)
    expect(() => computeTargetSize(null, '0', '')).toThrow(/宽度超出范围/)
    expect(() => computeTargetSize(null, '', String(MAX_DIMENSION + 1))).toThrow(/高度超出范围/)
  })
})

describe('parseBackgroundColor', () => {
  it('透明返回 null', () => {
    expect(parseBackgroundColor('transparent', '#ff0000')).toBeNull()
  })

  it('白色返回 #ffffff', () => {
    expect(parseBackgroundColor('white', '')).toBe('#ffffff')
  })

  it('自定义色接受 #rgb / #rrggbb', () => {
    expect(parseBackgroundColor('custom', '#abc')).toBe('#abc')
    expect(parseBackgroundColor('custom', '#aabbcc')).toBe('#aabbcc')
    expect(parseBackgroundColor('custom', '  #fff  ')).toBe('#fff')
  })

  it('非法颜色抛错', () => {
    expect(() => parseBackgroundColor('custom', 'red')).toThrow(/颜色无效/)
    expect(() => parseBackgroundColor('custom', '#abcd')).toThrow(/颜色无效/)
    expect(() => parseBackgroundColor('custom', '')).toThrow(/颜色无效/)
  })
})

describe('buildOutputFileName', () => {
  it('去 .svg 后缀加 .png', () => {
    expect(buildOutputFileName('icon.svg')).toBe('icon.png')
    expect(buildOutputFileName('ICON.SVG')).toBe('ICON.png')
  })

  it('无后缀直接加 .png', () => {
    expect(buildOutputFileName('noext')).toBe('noext.png')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('')).toBe('image.png')
    expect(buildOutputFileName('.svg')).toBe('image.png')
  })
})
