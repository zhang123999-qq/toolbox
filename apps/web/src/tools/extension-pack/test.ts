/**
 * extension-pack（#775）utils 单测：扩展打包校验与 zip 编解码。
 */
import { describe, expect, it } from 'vitest'
import { strFromU8 } from 'fflate'
import {
  packExtension,
  parsePackInput,
  summarizePack,
  unpackExtension,
  validatePackFiles,
  type PackFile,
} from './utils'

const BASE: PackFile[] = [
  { name: 'manifest.json', content: '{"manifest_version":3}' },
  { name: 'content.js', content: '// hello' },
]

describe('validatePackFiles', () => {
  it('合法清单通过', () => {
    expect(() => validatePackFiles(BASE)).not.toThrow()
    expect(() =>
      validatePackFiles([{ name: 'manifest.json', content: new Uint8Array([1, 2, 3]) }]),
    ).not.toThrow()
  })
  it('空清单报错', () => {
    expect(() => validatePackFiles([])).toThrow('至少需要一个文件')
    expect(() => validatePackFiles('x')).toThrow('至少需要一个文件')
  })
  it('非法条目报错', () => {
    expect(() => validatePackFiles([null])).toThrow('文件条目非法')
    expect(() => validatePackFiles(['str'])).toThrow('文件条目非法')
  })
  it('文件名非法报错', () => {
    expect(() => validatePackFiles([{ name: '  ', content: 'x' }])).toThrow('文件名不能为空')
    expect(() =>
      validatePackFiles([
        { name: 'manifest.json', content: 'x' },
        { name: '/abs.js', content: 'x' },
      ]),
    ).toThrow('非法文件名')
    expect(() =>
      validatePackFiles([
        { name: 'manifest.json', content: 'x' },
        { name: 'a\\b.js', content: 'x' },
      ]),
    ).toThrow('非法文件名')
    expect(() =>
      validatePackFiles([
        { name: 'manifest.json', content: 'x' },
        { name: '../evil.js', content: 'x' },
      ]),
    ).toThrow('非法文件名')
  })
  it('重复文件名报错', () => {
    expect(() =>
      validatePackFiles([
        { name: 'manifest.json', content: 'x' },
        { name: 'manifest.json', content: 'y' },
      ]),
    ).toThrow('重复文件名')
  })
  it('content 类型非法报错', () => {
    expect(() => validatePackFiles([{ name: 'manifest.json', content: 42 as never }])).toThrow(
      'content 必须是字符串或 Uint8Array',
    )
  })
  it('缺少 manifest.json 报错', () => {
    expect(() => validatePackFiles([{ name: 'content.js', content: 'x' }])).toThrow(
      '必须包含 manifest.json',
    )
  })
})

describe('packExtension / unpackExtension', () => {
  it('打包后解包内容一致', () => {
    const zip = packExtension(BASE)
    expect(zip.length).toBeGreaterThan(0)
    const out = unpackExtension(zip)
    expect(Object.keys(out).sort()).toEqual(['content.js', 'manifest.json'])
    expect(strFromU8(out['manifest.json'])).toBe('{"manifest_version":3}')
    expect(strFromU8(out['content.js'])).toBe('// hello')
  })
  it('Uint8Array 内容原样打包', () => {
    const bin = new Uint8Array([0, 1, 2, 250])
    const zip = packExtension([
      { name: 'manifest.json', content: '{}' },
      { name: 'icon.bin', content: bin },
    ])
    const out = unpackExtension(zip)
    expect(out['icon.bin']).toEqual(bin)
  })
  it('非法清单抛错', () => {
    expect(() => packExtension([])).toThrow('至少需要一个文件')
  })
})

describe('summarizePack', () => {
  it('输出文件数与大小', () => {
    const zip = packExtension(BASE)
    const s = summarizePack(zip, BASE)
    expect(s).toContain('已打包 2 个文件')
    expect(s).toContain('manifest.json')
    expect(s).toContain('content.js')
    expect(s).toContain(`${zip.length} 字节`)
  })
})

describe('parsePackInput', () => {
  it('合法 JSON 解析', () => {
    const o = parsePackInput(JSON.stringify({ files: BASE }))
    expect(o.files.length).toBe(2)
    expect(o.files[0].name).toBe('manifest.json')
  })
  it('files 缺省为空数组并报错', () => {
    expect(() => parsePackInput('{}')).toThrow('至少需要一个文件')
  })
  it('非法 JSON 报错', () => {
    expect(() => parsePackInput('{')).toThrow('不是合法 JSON')
  })
  it('非对象报错', () => {
    expect(() => parsePackInput('[1]')).toThrow('必须是 JSON 对象')
  })
  it('解析后仍做业务校验', () => {
    expect(() => parsePackInput('{"files":[{"name":"a.js","content":"x"}]}')).toThrow(
      '必须包含 manifest.json',
    )
  })
})
