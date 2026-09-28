import { describe, expect, it } from 'vitest'
import { buildManifestJson, isHexColor, parseIconLines } from './utils'

describe('pwa-manifest · isHexColor', () => {
  it('#rgb 与 #rrggbb 通过', () => {
    expect(isHexColor('#fff')).toBe(true)
    expect(isHexColor('#2563eb')).toBe(true)
    expect(isHexColor('#ABCDEF')).toBe(true)
  })

  it('非法格式不通过', () => {
    expect(isHexColor('2563eb')).toBe(false)
    expect(isHexColor('#ff')).toBe(false)
    expect(isHexColor('#fffff')).toBe(false)
    expect(isHexColor('#gggggg')).toBe(false)
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('')).toBe(false)
  })

  it('首尾空格被容忍', () => {
    expect(isHexColor('  #fff  ')).toBe(true)
  })
})

describe('pwa-manifest · parseIconLines', () => {
  it('解析「路径 尺寸」多行并推断 MIME', () => {
    expect(parseIconLines('icon-192.png 192x192\nicon-512.jpg 512x512')).toEqual([
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ])
  })

  it('空文本返回空数组，空行跳过', () => {
    expect(parseIconLines(undefined)).toEqual([])
    expect(parseIconLines(' \n ')).toEqual([])
  })

  it('svg 与 webp 后缀推断正确', () => {
    expect(parseIconLines('icon.svg 512x512')[0].type).toBe('image/svg+xml')
    expect(parseIconLines('icon.webp 192x192')[0].type).toBe('image/webp')
  })

  it('未知后缀回退 image/png', () => {
    expect(parseIconLines('icon.bmp 192x192')[0].type).toBe('image/png')
  })

  it('缺尺寸抛中文错带行号', () => {
    expect(() => parseIconLines('icon-192.png')).toThrow('第 1 行格式错误')
  })

  it('尺寸格式错误抛错', () => {
    expect(() => parseIconLines('icon.png 192')).toThrow('第 1 行格式错误')
    expect(() => parseIconLines('icon.png 192X192')).toThrow('第 1 行格式错误')
  })

  it('多余字段抛错', () => {
    expect(() => parseIconLines('a.png 192x192 extra')).toThrow('第 1 行格式错误')
  })

  it('错误行号指向第二行', () => {
    expect(() => parseIconLines('a.png 192x192\n坏行')).toThrow('第 2 行')
  })
})

describe('pwa-manifest · buildManifestJson', () => {
  it('只填必填时输出最小 manifest', () => {
    const obj = JSON.parse(buildManifestJson({ name: '我的应用', shortName: '应用' }))
    expect(obj).toMatchObject({
      name: '我的应用',
      short_name: '应用',
      display: 'standalone',
    })
  })

  it('name 为空抛中文错', () => {
    expect(() => buildManifestJson({ name: '  ', shortName: '应用' })).toThrow('name（应用名称）不能为空')
  })

  it('short_name 为空抛中文错', () => {
    expect(() => buildManifestJson({ name: '应用' })).toThrow('short_name（短名称）不能为空')
  })

  it('全部字段输出', () => {
    const obj = JSON.parse(
      buildManifestJson({
        name: '我的应用',
        shortName: '应用',
        startUrl: '/',
        display: 'fullscreen',
        themeColor: '#2563eb',
        backgroundColor: '#ffffff',
        icons: 'icon-192.png 192x192\nicon-512.png 512x512',
      }),
    )
    expect(obj.start_url).toBe('/')
    expect(obj.display).toBe('fullscreen')
    expect(obj.theme_color).toBe('#2563eb')
    expect(obj.background_color).toBe('#ffffff')
    expect(obj.icons).toHaveLength(2)
  })

  it('theme_color 格式错误抛中文错', () => {
    expect(() => buildManifestJson({ name: 'A', shortName: 'B', themeColor: 'red' })).toThrow(
      'theme_color 格式错误',
    )
  })

  it('background_color 格式错误抛中文错', () => {
    expect(() => buildManifestJson({ name: 'A', shortName: 'B', backgroundColor: '#ff' })).toThrow(
      'background_color 格式错误',
    )
  })

  it('空的可选字段不出现在输出里', () => {
    const out = buildManifestJson({ name: 'A', shortName: 'B', startUrl: ' ' })
    expect(out).not.toContain('start_url')
    expect(out).not.toContain('theme_color')
    expect(out).not.toContain('icons')
  })

  it('icons 格式错误透出中文错', () => {
    expect(() => buildManifestJson({ name: 'A', shortName: 'B', icons: '坏行' })).toThrow('第 1 行格式错误')
  })

  it('输出是合法 JSON 且缩进 2 格、换行结尾', () => {
    const out = buildManifestJson({ name: 'A', shortName: 'B' })
    expect(() => JSON.parse(out)).not.toThrow()
    expect(out).toContain('\n  "short_name": "B"')
    expect(out.endsWith('\n')).toBe(true)
  })
})
