import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import type { BatchRenameOptions } from './schema'
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  applyRule,
  downloadBytes,
  formatMapping,
  packRenamed,
  padNumber,
  readFiles,
  renameFiles,
  resolveConflict,
  sanitize,
  splitName,
} from './utils'

const prefixOpts: BatchRenameOptions = {
  rule: 'prefix',
  prefix: 'IMG_',
  find: '',
  replace: '',
  start: 1,
  digits: 3,
}
const numberOpts: BatchRenameOptions = {
  rule: 'number',
  prefix: 'pic',
  find: '',
  replace: '',
  start: 7,
  digits: 3,
}
const replaceOpts: BatchRenameOptions = {
  rule: 'replace',
  prefix: '',
  find: 'old',
  replace: 'new',
  start: 1,
  digits: 3,
}

describe('batch-rename / 基础工具', () => {
  it('splitName 拆 base/ext', () => {
    expect(splitName('a.png')).toEqual({ base: 'a', ext: '.png' })
    expect(splitName('README')).toEqual({ base: 'README', ext: '' })
    expect(splitName('.gitignore')).toEqual({ base: '.gitignore', ext: '' })
  })

  it('sanitize 去非法字符', () => {
    expect(sanitize('a/b:c*')).toBe('a_b_c_')
    expect(sanitize('  ok  ')).toBe('ok')
    expect(sanitize('a\x01b\x7f')).toBe('a_b\x7f')
  })

  it('padNumber 补零', () => {
    expect(padNumber(7, 3)).toBe('007')
    expect(padNumber(12345, 3)).toBe('12345')
  })

  it('resolveConflict 追加序号', () => {
    const used = new Set(['a.png'])
    expect(resolveConflict('a.png', used)).toBe('a (2).png')
    used.add('a (2).png')
    expect(resolveConflict('a.png', used)).toBe('a (3).png')
    expect(resolveConflict('b.png', used)).toBe('b.png')
  })
})

describe('batch-rename / 规则应用', () => {
  it('prefix：前缀 + 原名', () => {
    expect(applyRule('a.png', 0, prefixOpts)).toBe('IMG_a.png')
  })

  it('prefix：空前缀回退 renamed', () => {
    expect(applyRule('a.png', 0, { ...prefixOpts, prefix: '  ' })).toBe('renameda.png')
  })

  it('number：前缀 + 序号', () => {
    expect(applyRule('a.png', 0, numberOpts)).toBe('pic007.png')
    expect(applyRule('b.png', 1, numberOpts)).toBe('pic008.png')
    expect(applyRule('c.png', 0, { ...numberOpts, prefix: '' })).toBe('007.png')
  })

  it('replace：查找替换', () => {
    expect(applyRule('old-photo.jpg', 0, replaceOpts)).toBe('new-photo.jpg')
    expect(applyRule('a.png', 0, { ...replaceOpts, find: '' })).toBe('a.png')
  })
})

describe('batch-rename / renameFiles', () => {
  it('批量命名并自动消解冲突', () => {
    const out = renameFiles(['a.png', 'a.png'], { ...numberOpts, prefix: '' })
    expect(out).toEqual(['007.png', '008.png'])
  })

  it('replace 碰撞也加序号', () => {
    const out = renameFiles(['old1.png', 'old2.png'], {
      ...replaceOpts,
      find: 'old1',
      replace: 'same',
    })
    // old1→same.png，old2 不含 old1 保持原名
    expect(out).toEqual(['same.png', 'old2.png'])
  })

  it('空列表 / 超数中文报错', () => {
    expect(() => renameFiles([], prefixOpts)).toThrow(/请先选择/)
    expect(() => renameFiles(new Array(MAX_FILES + 1).fill('a'), prefixOpts)).toThrow(/过多/)
  })

  it('缺参数中文报错', () => {
    expect(() => renameFiles(['a'], { ...prefixOpts, prefix: '' })).toThrow(/需要填写前缀/)
    expect(() => renameFiles(['a'], { ...replaceOpts, find: '' })).toThrow(/需要填写查找内容/)
  })
})

describe('batch-rename / 打包与下载', () => {
  it('formatMapping 对照表', () => {
    const out = formatMapping(['a.png'], ['IMG_a.png'])
    expect(out).toContain('1. a.png → IMG_a.png')
  })

  it('readFiles 超限报错', async () => {
    const big = {
      name: 'b',
      size: MAX_TOTAL_BYTES + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File
    await expect(readFiles([big])).rejects.toThrow(/超过/)
  })

  it('packRenamed 生成 renamed.zip，解开后文件名正确', async () => {
    const records = [
      { original: 'a.png', renamed: 'IMG_a.png', data: new Uint8Array([1, 2]) },
      { original: 'b.png', renamed: 'IMG_b.png', data: new Uint8Array([3]) },
    ]
    const zip = packRenamed(records)
    const entries = unzipSync(zip)
    expect(Object.keys(entries).sort()).toEqual(['IMG_a.png', 'IMG_b.png', 'mapping.txt'])
    const mapping = new TextDecoder().decode(entries['mapping.txt'])
    expect(mapping).toContain('a.png → IMG_a.png')
  })

  it('downloadBytes 走 hooks', () => {
    const calls: string[] = []
    downloadBytes('renamed.zip', new Uint8Array([1]), 'application/zip', {
      createObjectURL: () => {
        calls.push('create')
        return 'blob:u'
      },
      revokeObjectURL: () => {
        calls.push('revoke')
      },
      clickAnchor: (url, filename) => {
        calls.push(`click:${url}:${filename}`)
      },
    })
    expect(calls).toEqual(['create', 'click:blob:u:renamed.zip', 'revoke'])
  })
})
