import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAP,
  DEFAULT_GROUP_SIZE,
  DEFAULT_QUALITY,
  MAX_FILE_SIZE,
  MAX_GAP,
  MAX_GROUP_SIZE,
  MAX_TOTAL_FILES,
  MIN_GROUP_SIZE,
  assertFileSizeOk,
  assertTotalCountOk,
  buildOutputFileName,
  chunkFiles,
  computeMergeLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBgColor,
  parseGap,
  parseGroupSize,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseGroupSize', () => {
  it('空串用默认 3', () => {
    expect(parseGroupSize('')).toBe(DEFAULT_GROUP_SIZE)
    expect(parseGroupSize('   ')).toBe(DEFAULT_GROUP_SIZE)
  })

  it('正常解析', () => {
    expect(parseGroupSize('2')).toBe(2)
    expect(parseGroupSize('10')).toBe(10)
    expect(parseGroupSize(' 5 ')).toBe(5)
  })

  it('非法抛错', () => {
    expect(() => parseGroupSize('abc')).toThrow(/组大小无效/)
    expect(() => parseGroupSize('2.5')).toThrow(/组大小无效/)
    expect(() => parseGroupSize('1')).toThrow(/超出范围/)
    expect(() => parseGroupSize('11')).toThrow(/超出范围/)
  })
})

describe('parseGap', () => {
  it('空串用默认 0', () => {
    expect(parseGap('')).toBe(DEFAULT_GAP)
    expect(parseGap('   ')).toBe(DEFAULT_GAP)
  })

  it('正常解析', () => {
    expect(parseGap('0')).toBe(0)
    expect(parseGap('100')).toBe(100)
  })

  it('非法抛错', () => {
    expect(() => parseGap('abc')).toThrow(/间距无效/)
    expect(() => parseGap('-1')).toThrow(/间距无效/)
    expect(() => parseGap(String(MAX_GAP + 1))).toThrow(/超出范围/)
  })
})

describe('parseBgColor', () => {
  it('合法 #rrggbb 通过（大小写均可）', () => {
    expect(parseBgColor('#ffffff')).toBe('#ffffff')
    expect(parseBgColor('  #ABCDEF ')).toBe('#ABCDEF')
  })

  it('非法抛错', () => {
    expect(() => parseBgColor('red')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#fff')).toThrow(/背景色无效/)
    expect(() => parseBgColor('#gggggg')).toThrow(/背景色无效/)
    expect(() => parseBgColor('')).toThrow(/背景色无效/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 80', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析与非法抛错', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
  })
})

describe('chunkFiles', () => {
  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  it('整除：8 张按 4 分组 → 2 组', () => {
    expect(chunkFiles(names, 4)).toEqual([
      ['a', 'b', 'c', 'd'],
      ['e', 'f', 'g', 'h'],
    ])
  })

  it('余 1：7 张按 3 分组 → [3,3,1]，末组单张保留', () => {
    const groups = chunkFiles(names.slice(0, 7), 3)
    expect(groups).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['g']])
    expect(groups[2]).toHaveLength(1)
  })

  it('余多：8 张按 3 分组 → [3,3,2]', () => {
    expect(chunkFiles(names, 3)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g', 'h'],
    ])
  })

  it('组大小大于总数 → 整组一组', () => {
    expect(chunkFiles(['a', 'b'], 10)).toEqual([['a', 'b']])
  })

  it('空列表 → 空分组', () => {
    expect(chunkFiles([], 3)).toEqual([])
  })

  it('保持原顺序且为泛型', () => {
    expect(chunkFiles([1, 2, 3], 2)).toEqual([[1, 2], [3]])
  })

  it('非法组大小抛错', () => {
    expect(() => chunkFiles(names, 0)).toThrow(/分组大小无效/)
    expect(() => chunkFiles(names, 2.5)).toThrow(/分组大小无效/)
  })
})

describe('computeMergeLayout', () => {
  const sizes = [
    { w: 100, h: 50 },
    { w: 60, h: 80 },
  ]

  it('横向居中：总宽=sum(w)+gap，总高=max(h)，y 居中', () => {
    // 宽=100+60+10=170，高=80；偏移：(0,15)、(110,0)
    expect(computeMergeLayout(sizes, 'horizontal', 10, 'center')).toEqual({
      width: 170,
      height: 80,
      offsets: [
        { x: 0, y: 15 },
        { x: 110, y: 0 },
      ],
    })
  })

  it('横向起点对齐：y 均为 0（顶部对齐）', () => {
    expect(computeMergeLayout(sizes, 'horizontal', 0, 'start')).toEqual({
      width: 160,
      height: 80,
      offsets: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    })
  })

  it('纵向居中：总高=sum(h)+gap，总宽=max(w)，x 居中', () => {
    // 高=50+80+10=140，宽=100；偏移：(0,0)、(20,60)
    expect(computeMergeLayout(sizes, 'vertical', 10, 'center')).toEqual({
      width: 100,
      height: 140,
      offsets: [
        { x: 0, y: 0 },
        { x: 20, y: 60 },
      ],
    })
  })

  it('纵向起点对齐：x 均为 0（左对齐）', () => {
    expect(computeMergeLayout(sizes, 'vertical', 5, 'start')).toEqual({
      width: 100,
      height: 135,
      offsets: [
        { x: 0, y: 0 },
        { x: 0, y: 55 },
      ],
    })
  })

  it('单张：总尺寸即图片尺寸，偏移为原点', () => {
    expect(computeMergeLayout([{ w: 300, h: 200 }], 'horizontal', 10, 'center')).toEqual({
      width: 300,
      height: 200,
      offsets: [{ x: 0, y: 0 }],
    })
  })

  it('三张横向几何：x 累加含间距', () => {
    const r = computeMergeLayout(
      [
        { w: 10, h: 10 },
        { w: 20, h: 30 },
        { w: 15, h: 20 },
      ],
      'horizontal',
      5,
      'center',
    )
    expect(r.width).toBe(10 + 20 + 15 + 5 * 2)
    expect(r.height).toBe(30)
    expect(r.offsets.map((o) => o.x)).toEqual([0, 15, 40])
    expect(r.offsets.map((o) => o.y)).toEqual([10, 0, 5])
  })

  it('空列表抛错', () => {
    expect(() => computeMergeLayout([], 'horizontal', 0, 'center')).toThrow(/图片列表为空/)
  })

  it('非法尺寸抛错', () => {
    expect(() => computeMergeLayout([{ w: 0, h: 10 }], 'horizontal', 0, 'center')).toThrow(
      /图片尺寸无效/,
    )
    expect(() => computeMergeLayout([{ w: NaN, h: 10 }], 'vertical', 0, 'start')).toThrow(
      /图片尺寸无效/,
    )
    expect(() => computeMergeLayout([{ w: 10, h: -5 }], 'vertical', 0, 'center')).toThrow(
      /图片尺寸无效/,
    )
  })

  it('负间距抛错', () => {
    expect(() => computeMergeLayout(sizes, 'horizontal', -1, 'center')).toThrow(/间距无效/)
    expect(() => computeMergeLayout(sizes, 'vertical', NaN, 'center')).toThrow(/间距无效/)
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 80)).toBeUndefined()
    expect(effectiveQuality('jpeg', 80)).toBe(0.8)
    expect(effectiveQuality('webp', 100)).toBe(1)
  })
})

describe('buildOutputFileName', () => {
  it('基名 + -merged-<组号> 后缀，按格式换扩展名', () => {
    expect(buildOutputFileName('a.png', 1, 'jpeg')).toBe('a-merged-1.jpg')
    expect(buildOutputFileName('photo.webp', 12, 'png')).toBe('photo-merged-12.png')
    expect(buildOutputFileName('x.bmp', 2, 'webp')).toBe('x-merged-2.webp')
  })

  it('无扩展名保留基名', () => {
    expect(buildOutputFileName('noext', 3, 'jpeg')).toBe('noext-merged-3.jpg')
  })

  it('空名兜底为 batch', () => {
    expect(buildOutputFileName('', 1, 'png')).toBe('batch-merged-1.png')
    expect(buildOutputFileName('.png', 1, 'png')).toBe('batch-merged-1.png')
  })
})

describe('assertFileSizeOk / assertTotalCountOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertTotalCountOk(MAX_TOTAL_FILES)).not.toThrow()
    expect(() => assertTotalCountOk(0)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
    expect(() => assertTotalCountOk(MAX_TOTAL_FILES + 1)).toThrow(/图片过多/)
  })

  it('常量边界与规格一致', () => {
    expect(MIN_GROUP_SIZE).toBe(2)
    expect(MAX_GROUP_SIZE).toBe(10)
    expect(MAX_GAP).toBe(100)
  })
})
