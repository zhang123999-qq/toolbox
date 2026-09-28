import { describe, expect, it } from 'vitest'
import { FAVICON_SIZES, isImageFile, pngFileName, scaleSizes, zipEntryName } from './utils'

describe('favicon-gen · zipEntryName / pngFileName', () => {
  it('条目名格式为 favicon-NxN.png', () => {
    expect(zipEntryName(16)).toBe('favicon-16x16.png')
    expect(zipEntryName(512)).toBe('favicon-512x512.png')
  })

  it('单个 PNG 文件名与条目名一致', () => {
    expect(pngFileName(32)).toBe('favicon-32x32.png')
  })
})

describe('favicon-gen · FAVICON_SIZES', () => {
  it('包含六种标准尺寸且升序', () => {
    expect([...FAVICON_SIZES]).toEqual([16, 32, 48, 180, 192, 512])
  })
})

describe('favicon-gen · scaleSizes', () => {
  it('返回六个尺寸的计划', () => {
    const plans = scaleSizes()
    expect(plans).toHaveLength(6)
  })

  it('目标宽高为正方形且条目名对应', () => {
    for (const p of scaleSizes()) {
      expect(p.width).toBe(p.size)
      expect(p.height).toBe(p.size)
      expect(p.entryName).toBe(`favicon-${p.size}x${p.size}.png`)
    }
  })

  it('首个与末个计划内容精确', () => {
    const plans = scaleSizes()
    expect(plans[0]).toEqual({ size: 16, width: 16, height: 16, entryName: 'favicon-16x16.png' })
    expect(plans[5]).toEqual({
      size: 512,
      width: 512,
      height: 512,
      entryName: 'favicon-512x512.png',
    })
  })
})

describe('favicon-gen · isImageFile', () => {
  it('image/* 通过', () => {
    expect(isImageFile('image/png')).toBe(true)
    expect(isImageFile('image/jpeg')).toBe(true)
    expect(isImageFile('image/svg+xml')).toBe(true)
  })

  it('大小写不敏感', () => {
    expect(isImageFile('IMAGE/PNG')).toBe(true)
  })

  it('非图片不通过', () => {
    expect(isImageFile('text/plain')).toBe(false)
    expect(isImageFile('application/pdf')).toBe(false)
    expect(isImageFile('')).toBe(false)
  })

  it('undefined 视为非图片', () => {
    expect(isImageFile(undefined as unknown as string)).toBe(false)
  })
})
