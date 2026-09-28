/**
 * chart-theme（#687）utils 单测：颜色 / 色板 / 字号 / 字体校验与主题构建。
 */
import { describe, expect, it } from 'vitest'
import {
  buildPreviewOption,
  buildThemeJson,
  parseFontFamily,
  parseHexColor,
  parsePalette,
  parseTitle,
  parseTitleSize,
  resolveOpt,
  resolveTheme,
} from './utils'

describe('parseHexColor', () => {
  it('接受 #RGB 与 #RRGGBB 并转小写', () => {
    expect(parseHexColor('#FFF', '背景色')).toBe('#fff')
    expect(parseHexColor('  #1a2B3c ', '背景色')).toBe('#1a2b3c')
  })

  it('非法格式抛中文错', () => {
    expect(() => parseHexColor('red', '背景色')).toThrowError('背景色须为 #RGB 或 #RRGGBB 格式')
    expect(() => parseHexColor('#12345', '背景色')).toThrowError('背景色')
    expect(() => parseHexColor('', '背景色')).toThrowError('（空）')
  })
})

describe('parsePalette', () => {
  it('逗号分隔解析并校验每个颜色', () => {
    expect(parsePalette('#ff0000, #00ff00')).toEqual(['#ff0000', '#00ff00'])
  })

  it('支持中文逗号与换行分隔', () => {
    expect(parsePalette('#ff0000，#00ff00\n#0000ff')).toEqual(['#ff0000', '#00ff00', '#0000ff'])
  })

  it('空色板抛错', () => {
    expect(() => parsePalette('  ')).toThrowError('主色板不能为空')
  })

  it('超过 12 个颜色抛错', () => {
    const many = Array.from({ length: 13 }, (_, i) => `#${String(i).padStart(6, '0')}`).join(',')
    expect(() => parsePalette(many)).toThrowError('最多 12 个颜色')
  })

  it('错误信息带序号', () => {
    expect(() => parsePalette('#ff0000, nope')).toThrowError('主色板第 2 个颜色')
  })
})

describe('parseTitleSize', () => {
  it('接受 10–48 的整数', () => {
    expect(parseTitleSize('18')).toBe(18)
    expect(parseTitleSize(' 48 ')).toBe(48)
  })

  it('非整数或越界抛错', () => {
    expect(() => parseTitleSize('18.5')).toThrowError('须为正整数')
    expect(() => parseTitleSize('9')).toThrowError('10–48')
    expect(() => parseTitleSize('49')).toThrowError('10–48')
    expect(() => parseTitleSize('')).toThrowError('（空）')
  })
})

describe('parseFontFamily', () => {
  it('接受非空字体名', () => {
    expect(parseFontFamily('  PingFang SC  ')).toBe('PingFang SC')
  })

  it('空字体与过长字体抛错', () => {
    expect(() => parseFontFamily('   ')).toThrowError('字体不能为空')
    expect(() => parseFontFamily('a'.repeat(121))).toThrowError('过长')
  })
})

describe('resolveOpt', () => {
  it('空输入回退默认值', () => {
    expect(resolveOpt('  ', '#fff')).toBe('#fff')
    expect(resolveOpt('#000', '#fff')).toBe('#000')
  })
})

describe('parseTitle', () => {
  it('留空返回空字符串', () => {
    expect(parseTitle('')).toBe('')
  })

  it('超长标题抛错', () => {
    expect(() => parseTitle('标'.repeat(61))).toThrowError('最多 60 字符')
  })
})

describe('buildThemeJson', () => {
  const theme = buildThemeJson({
    background: '#ffffff',
    palette: ['#5470c6', '#91cc75'],
    fontFamily: 'sans-serif',
    titleFontSize: 18,
  })

  it('色板与背景色写入主题', () => {
    expect(theme.color).toEqual(['#5470c6', '#91cc75'])
    expect(theme.backgroundColor).toBe('#ffffff')
  })

  it('标题字号与字体写入', () => {
    const title = theme.title as { textStyle: { fontSize: number; fontFamily: string } }
    expect(title.textStyle.fontSize).toBe(18)
    expect(title.textStyle.fontFamily).toBe('sans-serif')
  })

  it('可 JSON 序列化', () => {
    expect(() => JSON.stringify(theme)).not.toThrow()
  })
})

describe('resolveTheme', () => {
  it('空选项回退默认值并组装主题', () => {
    const { theme, title } = resolveTheme({ title: '演示', background: '', palette: '', fontFamily: '', titleSize: '' })
    expect(title).toBe('演示')
    expect(theme.backgroundColor).toBe('#ffffff')
    expect((theme.color as string[]).length).toBe(5)
  })

  it('自定义值透传', () => {
    const { theme, title } = resolveTheme({
      title: '',
      background: '#000000',
      palette: '#ff0000,#00ff00',
      fontFamily: 'serif',
      titleSize: '24',
    })
    expect(title).toBe('')
    expect(theme.backgroundColor).toBe('#000000')
    expect(theme.color).toEqual(['#ff0000', '#00ff00'])
  })

  it('非法值抛中文错', () => {
    expect(() => resolveTheme({ title: '', background: 'red', palette: '', fontFamily: '', titleSize: '' })).toThrowError(
      '背景色须为 #RGB 或 #RRGGBB 格式',
    )
  })
})

describe('buildPreviewOption', () => {
  const theme = buildThemeJson({
    background: '#000000',
    palette: ['#ff0000', '#00ff00'],
    fontFamily: 'serif',
    titleFontSize: 20,
  })

  it('标题传入 option', () => {
    const option = buildPreviewOption(theme, '演示') as { title: { text: string } }
    expect(option.title.text).toBe('演示')
  })

  it('系列颜色取自色板', () => {
    const option = buildPreviewOption(theme, '') as {
      series: { itemStyle: { color: string } }[]
    }
    expect(option.series[0].itemStyle.color).toBe('#ff0000')
    expect(option.series[1].itemStyle.color).toBe('#00ff00')
  })

  it('空标题也正常构建', () => {
    const option = buildPreviewOption(theme, '') as { title: { text: string } }
    expect(option.title.text).toBe('')
  })
})
