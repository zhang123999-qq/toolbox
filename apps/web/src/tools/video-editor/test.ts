import { beforeEach, describe, expect, it } from 'vitest'
import {
  addSegment,
  buildConcatArgs,
  buildConcatListFile,
  buildTrimArgs,
  createSegment,
  editorFileName,
  escapeConcatPath,
  formatClock,
  formatFfmpegTime,
  makeSegmentId,
  moveSegment,
  parseTimeInput,
  removeSegment,
  resetSegmentSeq,
  tempSegmentName,
  totalDuration,
  validateSegmentAgainstDuration,
} from './utils'
import type { Segment } from './utils'

beforeEach(() => resetSegmentSeq())

function seg(start: number, end: number): Segment {
  return createSegment(start, end)
}

describe('video-editor / 时间解析与格式化', () => {
  it('parseTimeInput 解析秒 / 分:秒 / 时:分:秒', () => {
    expect(parseTimeInput('83.5')).toBe(83.5)
    expect(parseTimeInput('  90  ')).toBe(90)
    expect(parseTimeInput('1:23.5')).toBe(83.5)
    expect(parseTimeInput('01:05')).toBe(65)
    expect(parseTimeInput('1:02:03')).toBe(3723)
    expect(parseTimeInput('0:00')).toBe(0)
  })

  it('parseTimeInput 非法格式抛中文错', () => {
    expect(() => parseTimeInput('')).toThrow(/时间不能为空/)
    expect(() => parseTimeInput('   ')).toThrow(/时间不能为空/)
    expect(() => parseTimeInput('abc')).toThrow(/应为非负数字/)
    expect(() => parseTimeInput('-5')).toThrow(/应为非负数字/)
    expect(() => parseTimeInput('1:2:3:4')).toThrow(/时间格式非法/)
    expect(() => parseTimeInput('a:b')).toThrow(/各部分应为非负数/)
    expect(() => parseTimeInput('-1:30')).toThrow(/各部分应为非负数/)
    expect(() => parseTimeInput('1:75')).toThrow(/秒应小于 60/)
    expect(() => parseTimeInput('1.5:30')).toThrow(/分钟应为整数/)
    expect(() => parseTimeInput('1:75:30')).toThrow(/分、秒应小于 60/)
    expect(() => parseTimeInput('1:30:75')).toThrow(/分、秒应小于 60/)
    expect(() => parseTimeInput('1.5:30:20')).toThrow(/时、分应为整数/)
    expect(() => parseTimeInput('1:2.5:20')).toThrow(/时、分应为整数/)
  })

  it('formatClock 格式化为 分:秒.百分秒', () => {
    expect(formatClock(0)).toBe('00:00.00')
    expect(formatClock(83.5)).toBe('01:23.50')
    expect(formatClock(3723.456)).toBe('62:03.46')
    expect(() => formatClock(-1)).toThrow(/时间非法/)
    expect(() => formatClock(Number.NaN)).toThrow(/时间非法/)
  })

  it('formatFfmpegTime 保留 3 位小数', () => {
    expect(formatFfmpegTime(83.5)).toBe('83.500')
    expect(formatFfmpegTime(0)).toBe('0.000')
    expect(() => formatFfmpegTime(-1)).toThrow(/时间非法/)
    expect(() => formatFfmpegTime(Number.POSITIVE_INFINITY)).toThrow(/时间非法/)
  })
})

describe('video-editor / 片段列表管理', () => {
  it('makeSegmentId 递增且 reset 后可预测', () => {
    expect(makeSegmentId()).toBe('seg-1')
    expect(makeSegmentId()).toBe('seg-2')
    resetSegmentSeq()
    expect(makeSegmentId()).toBe('seg-1')
  })

  it('createSegment 校验起止时间', () => {
    const s = seg(1, 2.5)
    expect(s).toMatchObject({ id: 'seg-1', start: 1, end: 2.5 })
    expect(() => seg(Number.NaN, 2)).toThrow(/有效数字/)
    expect(() => seg(1, Number.NaN)).toThrow(/有效数字/)
    expect(() => seg(-1, 2)).toThrow(/不能为负数/)
    expect(() => seg(1, -2)).toThrow(/不能为负数/)
    expect(() => seg(2, 2)).toThrow(/必须小于结束时间/)
    expect(() => seg(3, 2)).toThrow(/必须小于结束时间/)
  })

  it('addSegment 追加并保持原列表不变', () => {
    const list: Segment[] = [seg(0, 1)]
    const next = addSegment(list, 2, 3)
    expect(next.length).toBe(2)
    expect(list.length).toBe(1)
    expect(next[1]!.id).toBe('seg-2')
    expect(() => addSegment(list, 5, 4)).toThrow(/必须小于结束时间/)
  })

  it('removeSegment 按 id 删除', () => {
    const list = [seg(0, 1), seg(2, 3)]
    const next = removeSegment(list, 'seg-1')
    expect(next.map((s) => s.id)).toEqual(['seg-2'])
    expect(list.length).toBe(2)
    expect(() => removeSegment(list, 'seg-99')).toThrow(/片段不存在/)
  })

  it('moveSegment 上下移动并保持原列表不变', () => {
    const list = [seg(0, 1), seg(2, 3), seg(4, 5)]
    expect(moveSegment(list, 'seg-2', -1).map((s) => s.id)).toEqual(['seg-2', 'seg-1', 'seg-3'])
    expect(moveSegment(list, 'seg-2', 1).map((s) => s.id)).toEqual(['seg-1', 'seg-3', 'seg-2'])
    expect(list.map((s) => s.id)).toEqual(['seg-1', 'seg-2', 'seg-3'])
  })

  it('moveSegment 边界与非法参数抛中文错', () => {
    const list = [seg(0, 1), seg(2, 3)]
    expect(() => moveSegment(list, 'seg-1', -1)).toThrow(/已经是第一个片段/)
    expect(() => moveSegment(list, 'seg-2', 1)).toThrow(/已经是最后一个片段/)
    expect(() => moveSegment(list, 'seg-99', 1)).toThrow(/片段不存在/)
    expect(() => moveSegment(list, 'seg-1', 0 as -1 | 1)).toThrow(/移动方向非法/)
    expect(() => moveSegment(list, 'seg-1', 2 as -1 | 1)).toThrow(/移动方向非法/)
  })

  it('totalDuration 求和', () => {
    expect(totalDuration([])).toBe(0)
    expect(totalDuration([seg(0, 1), seg(2, 4.5)])).toBe(3.5)
  })

  it('validateSegmentAgainstDuration 校验片段不超视频时长', () => {
    expect(() => validateSegmentAgainstDuration(seg(0, 5), 10)).not.toThrow()
    expect(() => validateSegmentAgainstDuration(seg(0, 10), 10)).not.toThrow()
    // 时长未知（0）时跳过上限检查
    expect(() => validateSegmentAgainstDuration(seg(0, 999), 0)).not.toThrow()
    expect(() => validateSegmentAgainstDuration(seg(0, 11), 10)).toThrow(/超出视频时长/)
    expect(() => validateSegmentAgainstDuration(seg(0, 1), -1)).toThrow(/视频时长非法/)
    expect(() => validateSegmentAgainstDuration(seg(0, 1), Number.NaN)).toThrow(/视频时长非法/)
  })
})

describe('video-editor / ffmpeg 参数拼装', () => {
  it('buildTrimArgs 拼出输入定位裁剪参数', () => {
    const args = buildTrimArgs('in.mp4', 1.5, 4, 'seg-0.mp4')
    expect(args).toEqual([
      '-ss',
      '1.500',
      '-to',
      '4.000',
      '-i',
      'in.mp4',
      '-c',
      'copy',
      'seg-0.mp4',
    ])
  })

  it('buildTrimArgs 非法参数抛中文错', () => {
    expect(() => buildTrimArgs('in.mp4', 4, 1, 'o.mp4')).toThrow(/必须小于结束时间/)
    expect(() => buildTrimArgs('in.mp4', Number.NaN, 2, 'o.mp4')).toThrow(/有效数字/)
    expect(() => buildTrimArgs('in.mp4', -1, 2, 'o.mp4')).toThrow(/不能为负数/)
    expect(() => buildTrimArgs('', 1, 2, 'o.mp4')).toThrow(/文件名不能为空/)
    expect(() => buildTrimArgs('in.mp4', 1, 2, '')).toThrow(/文件名不能为空/)
  })

  it('escapeConcatPath 转义单引号', () => {
    expect(escapeConcatPath('seg-0.mp4')).toBe('seg-0.mp4')
    expect(escapeConcatPath("it's.mp4")).toBe("it'\\''s.mp4")
    expect(() => escapeConcatPath('')).toThrow(/文件路径不能为空/)
  })

  it('buildConcatListFile 生成 concat 列表', () => {
    expect(buildConcatListFile(['seg-0.mp4', 'seg-1.mp4'])).toBe(
      "file 'seg-0.mp4'\nfile 'seg-1.mp4'\n",
    )
    expect(buildConcatListFile(["it's.mp4"])).toBe("file 'it'\\''s.mp4'\n")
    expect(() => buildConcatListFile([])).toThrow(/没有可拼接的片段文件/)
  })

  it('buildConcatArgs 拼出拼接参数', () => {
    expect(buildConcatArgs('list.txt', 'out.mp4')).toEqual([
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
    expect(() => buildConcatArgs('', 'out.mp4')).toThrow(/文件名不能为空/)
    expect(() => buildConcatArgs('list.txt', '')).toThrow(/文件名不能为空/)
  })

  it('editorFileName / tempSegmentName 生成文件名', () => {
    expect(editorFileName('movie.mp4')).toBe('movie-edit.mp4')
    expect(editorFileName('a.b.mkv')).toBe('a.b-edit.mp4')
    expect(editorFileName('novideo')).toBe('novideo-edit.mp4')
    expect(editorFileName('.mp4')).toBe('video-edit.mp4')
    expect(tempSegmentName(0)).toBe('seg-0.mp4')
    expect(tempSegmentName(12)).toBe('seg-12.mp4')
    expect(() => tempSegmentName(-1)).toThrow(/片段序号非法/)
    expect(() => tempSegmentName(1.5)).toThrow(/片段序号非法/)
  })
})
