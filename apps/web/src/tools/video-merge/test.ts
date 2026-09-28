import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  buildConcatList,
  buildMergeArgs,
  buildMergeReport,
  escapeConcatName,
  formatBytes,
  mergeFileName,
  validateFileList,
  validateFileSizes,
} from './utils'

describe('video-merge / 文件清单校验', () => {
  it('至少 2 个文件', () => {
    expect(() => validateFileList(0)).toThrow(/至少需要 2 个视频/)
    expect(() => validateFileList(1)).toThrow(/至少需要 2 个视频/)
    expect(() => validateFileList(1.5)).toThrow(/至少需要 2 个视频/)
    expect(() => validateFileList(2)).not.toThrow()
    expect(() => validateFileList(10)).not.toThrow()
  })

  it('文件大小检查：超限 / 为空 / 非法', () => {
    expect(() => validateFileSizes([100, 200])).not.toThrow()
    expect(() => validateFileSizes([MAX_FILE_BYTES])).not.toThrow()
    expect(() => validateFileSizes([100, MAX_FILE_BYTES + 1])).toThrow(/第 2 个文件过大/)
    expect(() => validateFileSizes([0])).toThrow(/第 1 个文件为空/)
    expect(() => validateFileSizes([Number.NaN])).toThrow(/第 1 个文件大小非法/)
    expect(() => validateFileSizes([-5])).toThrow(/第 1 个文件大小非法/)
    expect(() => validateFileSizes([])).not.toThrow()
  })

  it('formatBytes 各量级', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MiB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GiB')
    expect(() => formatBytes(-1)).toThrow(/字节数非法/)
  })
})

describe('video-merge / concat 列表', () => {
  it('单引号转义', () => {
    expect(escapeConcatName("it's.mp4")).toBe("it'\\''s.mp4")
    expect(escapeConcatName('plain.mp4')).toBe('plain.mp4')
  })

  it('生成 concat 列表文件内容', () => {
    expect(buildConcatList(['a.mp4', 'b.mp4'])).toBe("file 'a.mp4'\nfile 'b.mp4'\n")
    expect(buildConcatList(["it's.mp4"])).toBe("file 'it'\\''s.mp4'\n")
  })
})

describe('video-merge / ffmpeg 参数拼装', () => {
  it('重编码模式统一 H.264 + AAC', () => {
    expect(buildMergeArgs('list.txt', 'out.mp4', true)).toEqual([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'list.txt',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-c:a',
      'aac',
      'out.mp4',
    ])
  })

  it('流拷贝模式', () => {
    expect(buildMergeArgs('list.txt', 'out.mp4', false)).toEqual([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'list.txt',
      '-c',
      'copy',
      'out.mp4',
    ])
  })
})

describe('video-merge / 文件名与报告', () => {
  it('固定输出 merged.mp4', () => {
    expect(mergeFileName()).toBe('merged.mp4')
  })

  it('报告含片段清单、模式与大小', () => {
    const report = buildMergeReport(['a.mp4', 'b.mp4'], true, 2048)
    expect(report).toContain('已按顺序合并 2 个视频')
    expect(report).toContain('1. a.mp4')
    expect(report).toContain('2. b.mp4')
    expect(report).toContain('重编码')
    expect(report).toContain('2.00 KiB')
    const copyReport = buildMergeReport(['a.mp4', 'b.mp4'], false, 100)
    expect(copyReport).toContain('流拷贝')
  })
})
