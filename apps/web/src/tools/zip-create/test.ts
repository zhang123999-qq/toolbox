import { describe, expect, it, vi } from 'vitest'
import { unzipSync } from 'fflate'
import type { DownloadHooks } from './utils'
import {
  COMPRESSION_LEVELS,
  MAX_TOTAL_BYTES,
  checkEntries,
  checkLevel,
  createZip,
  dedupeNames,
  downloadBytes,
  formatReport,
  formatSize,
  readUploads,
  resolveArchiveName,
  sanitizeName,
  totalBytes,
} from './utils'

const enc = new TextEncoder()
function entry(name: string, text: string) {
  return { name, data: enc.encode(text) }
}

describe('zip-create / 基础工具', () => {
  it('体积格式化覆盖 B / KiB / MiB / GiB', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1024)).toBe('1.00 KiB')
    expect(formatSize(1536)).toBe('1.50 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('压缩级别白名单是 0–9', () => {
    expect(COMPRESSION_LEVELS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('totalBytes 累加各条目长度', () => {
    expect(totalBytes([entry('a', 'abc'), entry('b', 'de')])).toBe(5)
    expect(totalBytes([])).toBe(0)
  })
})

describe('zip-create / 校验', () => {
  it('空选择直接报错', () => {
    expect(() => checkEntries([])).toThrow(/至少一个文件/)
  })

  it('总大小超 200 MiB 报错', () => {
    const big = { name: 'big.bin', data: new Uint8Array(MAX_TOTAL_BYTES + 1) }
    expect(() => checkEntries([big])).toThrow(/超过/)
  })

  it('合法条目通过校验', () => {
    expect(() => checkEntries([entry('a.txt', 'x')])).not.toThrow()
  })

  it('压缩级别越界报错', () => {
    expect(() => checkLevel(-1)).toThrow(/0–9/)
    expect(() => checkLevel(10)).toThrow(/0–9/)
    expect(() => checkLevel(4.5)).toThrow(/0–9/)
    expect(() => checkLevel(Number.NaN)).toThrow(/0–9/)
    expect(() => checkLevel(6)).not.toThrow()
  })
})

describe('zip-create / 文件名处理', () => {
  it('sanitizeName 只保留基名', () => {
    expect(sanitizeName('C:\\Users\\x\\a.txt')).toBe('a.txt')
    expect(sanitizeName('/tmp/dir/b.txt')).toBe('b.txt')
    expect(sanitizeName('plain.txt')).toBe('plain.txt')
  })

  it('空名兜底为 unnamed', () => {
    expect(sanitizeName('')).toBe('unnamed')
    expect(sanitizeName('   ')).toBe('unnamed')
  })

  it('dedupeNames 给重名加序号（扩展名前）', () => {
    expect(dedupeNames(['a.txt', 'a.txt', 'a.txt'])).toEqual(['a.txt', 'a (2).txt', 'a (3).txt'])
  })

  it('无扩展名的重名直接追加序号', () => {
    expect(dedupeNames(['LICENSE', 'LICENSE'])).toEqual(['LICENSE', 'LICENSE (2)'])
  })

  it('不重名原样返回', () => {
    expect(dedupeNames(['a.txt', 'b.txt'])).toEqual(['a.txt', 'b.txt'])
  })

  it('resolveArchiveName 去空白与 .zip 后缀', () => {
    expect(resolveArchiveName('  我的包.zip ')).toBe('我的包')
    expect(resolveArchiveName('')).toBe('archive')
    expect(resolveArchiveName('   ')).toBe('archive')
    expect(resolveArchiveName('pack')).toBe('pack')
  })
})

describe('zip-create / 打包', () => {
  it('打包后能解开且内容一致', () => {
    const zip = createZip([entry('a.txt', 'hello'), entry('b.txt', 'world')], { level: 6 })
    const out = unzipSync(zip)
    expect(new TextDecoder().decode(out['a.txt'])).toBe('hello')
    expect(new TextDecoder().decode(out['b.txt'])).toBe('world')
  })

  it('级别 0（仅存储）与级别 9 都能打包', () => {
    const files = [entry('a.txt', 'x'.repeat(1000))]
    expect(createZip(files, { level: 0 }).length).toBeGreaterThan(0)
    expect(createZip(files, { level: 9 }).length).toBeGreaterThan(0)
  })

  it('重名文件打包后条目名唯一', () => {
    const zip = createZip([entry('a.txt', '1'), entry('a.txt', '2')], { level: 6 })
    const names = Object.keys(unzipSync(zip)).sort()
    expect(names).toEqual(['a (2).txt', 'a.txt'])
  })

  it('空文件也能打包（条目长度为 0）', () => {
    const zip = createZip([entry('empty.txt', '')], { level: 6 })
    expect(unzipSync(zip)['empty.txt']?.length).toBe(0)
  })

  it('空选择与非法级别在打包时同样报错', () => {
    expect(() => createZip([], { level: 6 })).toThrow(/至少一个文件/)
    expect(() => createZip([entry('a', 'x')], { level: 99 })).toThrow(/0–9/)
  })
})

describe('zip-create / 报告与读取', () => {
  it('formatReport 包含包名、数量与清单', () => {
    const report = formatReport('my-pack', ['a.txt', 'b.txt'], 100, 60, 6)
    expect(report).toContain('my-pack.zip')
    expect(report).toContain('文件数：2')
    expect(report).toContain('1. a.txt')
    expect(report).toContain('2. b.txt')
  })

  it('readUploads 保留文件名并读出字节', async () => {
    const files = [new File([enc.encode('abc')], 'a.txt'), new File([enc.encode('de')], 'b.txt')]
    const entries = await readUploads(files)
    expect(entries.map((e) => e.name)).toEqual(['a.txt', 'b.txt'])
    expect(entries[0]?.data.length).toBe(3)
  })

  it('readUploads 空数组返回空数组', async () => {
    await expect(readUploads([])).resolves.toEqual([])
  })
})

describe('zip-create / 下载', () => {
  it('downloadBytes 按顺序调用 hooks 并回收 URL', () => {
    const calls: string[] = []
    const hooks: DownloadHooks = {
      createObjectURL: () => {
        calls.push('create')
        return 'blob:fake'
      },
      revokeObjectURL: () => {
        calls.push('revoke')
      },
      clickAnchor: (url, filename) => {
        calls.push(`click:${url}:${filename}`)
      },
    }
    downloadBytes('a.zip', enc.encode('x'), 'application/zip', hooks)
    expect(calls).toEqual(['create', 'click:blob:fake:a.zip', 'revoke'])
  })

  it('click 抛错时仍然回收 URL', () => {
    const revoked: string[] = []
    const hooks: DownloadHooks = {
      createObjectURL: () => 'blob:fake',
      revokeObjectURL: (url) => {
        revoked.push(url)
      },
      clickAnchor: () => {
        throw new Error('boom')
      },
    }
    expect(() => downloadBytes('a.zip', enc.encode('x'), 'application/zip', hooks)).toThrow('boom')
    expect(revoked).toEqual(['blob:fake'])
  })

  it('默认 MIME 是 application/octet-stream', () => {
    const seen: string[] = []
    const hooks: DownloadHooks = {
      createObjectURL: (blob) => {
        seen.push(blob.type)
        return 'blob:fake'
      },
      revokeObjectURL: () => {},
      clickAnchor: () => {},
    }
    downloadBytes('a.bin', enc.encode('x'), undefined, hooks)
    expect(seen).toEqual(['application/octet-stream'])
  })

  it('vi  spy 能观察到 hooks 被调用', () => {
    const clickAnchor = vi.fn()
    downloadBytes('a.zip', enc.encode('x'), 'application/zip', {
      createObjectURL: () => 'blob:fake',
      revokeObjectURL: () => {},
      clickAnchor,
    })
    expect(clickAnchor).toHaveBeenCalledWith('blob:fake', 'a.zip')
  })
})
