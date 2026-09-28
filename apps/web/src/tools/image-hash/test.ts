import { describe, expect, it } from 'vitest'
import {
  GRAY_SIZE,
  HASH_HEX_LENGTH,
  MAX_FILE_SIZE,
  aHash,
  assertFileSizeOk,
  bitsToHex,
  dHash,
  dct2d,
  errorMessage,
  hammingDistance,
  hexToBits,
  pHash,
  rgbaToGray32,
  similarityPercent,
  similarityText,
} from './utils'

/** 全黑 32×32 灰度数组 */
function blackGray(): number[] {
  return new Array<number>(GRAY_SIZE * GRAY_SIZE).fill(0)
}

/** 上半黑、下半白 32×32 灰度数组 */
function halfGray(): number[] {
  const g = new Array<number>(GRAY_SIZE * GRAY_SIZE)
  for (let y = 0; y < GRAY_SIZE; y++) {
    for (let x = 0; x < GRAY_SIZE; x++) {
      g[y * GRAY_SIZE + x] = y < GRAY_SIZE / 2 ? 0 : 255
    }
  }
  return g
}

/** 水平递减灰度（左亮右暗）：gray = 255 - x */
function gradientGray(): number[] {
  const g = new Array<number>(GRAY_SIZE * GRAY_SIZE)
  for (let y = 0; y < GRAY_SIZE; y++) {
    for (let x = 0; x < GRAY_SIZE; x++) {
      g[y * GRAY_SIZE + x] = 255 - x
    }
  }
  return g
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
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

describe('rgbaToGray32', () => {
  it('按 BT.601 加权转灰度（已知值）', () => {
    const rgba = new Uint8ClampedArray(GRAY_SIZE * GRAY_SIZE * 4)
    // 像素 0：纯红 → round(0.299*255)=76；像素 1：纯绿 → round(0.587*255)=150
    // 像素 2：纯蓝 → round(0.114*255)=29；像素 3：白 → 255；像素 4：黑 → 0
    rgba.set([255, 0, 0, 255], 0)
    rgba.set([0, 255, 0, 255], 4)
    rgba.set([0, 0, 255, 255], 8)
    rgba.set([255, 255, 255, 255], 12)
    rgba.set([0, 0, 0, 255], 16)
    const gray = rgbaToGray32(rgba)
    expect(gray.length).toBe(GRAY_SIZE * GRAY_SIZE)
    expect(gray[0]).toBe(76)
    expect(gray[1]).toBe(150)
    expect(gray[2]).toBe(29)
    expect(gray[3]).toBe(255)
    expect(gray[4]).toBe(0)
  })

  it('长度非法抛错', () => {
    expect(() => rgbaToGray32(new Uint8ClampedArray(100))).toThrow(/像素数据非法/)
  })
})

describe('bitsToHex / hexToBits', () => {
  it('64 个 1 → 16 个 f', () => {
    expect(bitsToHex(new Array<number>(64).fill(1))).toBe('ffffffffffffffff')
  })

  it('交替 1010… → 16 个 a', () => {
    const bits = new Array<number>(64)
    for (let i = 0; i < 64; i++) bits[i] = i % 2 === 0 ? 1 : 0
    expect(bitsToHex(bits)).toBe('aaaaaaaaaaaaaaaa')
  })

  it('长度不是 64 或非数组抛错', () => {
    expect(() => bitsToHex(new Array<number>(63).fill(0))).toThrow(/比特数组非法/)
    expect(() => bitsToHex('0'.repeat(64) as unknown as number[])).toThrow(/比特数组非法/)
  })

  it('hexToBits 往返一致（大小写均可）', () => {
    const hex = '0123456789abcdef'
    expect(bitsToHex(hexToBits(hex))).toBe(hex)
    expect(bitsToHex(hexToBits('ABCDEF0123456789'))).toBe('abcdef0123456789')
  })

  it('hex 长度非法或含非法字符或非字符串抛错', () => {
    expect(() => hexToBits('0'.repeat(15))).toThrow(/哈希非法/)
    expect(() => hexToBits('0'.repeat(17))).toThrow(/哈希非法/)
    expect(() => hexToBits('g'.repeat(16))).toThrow(/哈希非法/)
    expect(() => hexToBits(123 as unknown as string)).toThrow(/哈希非法/)
  })
})

describe('aHash', () => {
  it('全黑图：均值为 0，无像素大于均值 → 全 0', () => {
    expect(aHash(blackGray())).toBe('0000000000000000')
  })

  it('上半黑下半白：均值 127.5，下半 32 比特为 1', () => {
    expect(aHash(halfGray())).toBe('00000000ffffffff')
  })

  it('输出恒为 16 位 hex', () => {
    expect(aHash(gradientGray())).toHaveLength(HASH_HEX_LENGTH)
  })

  it('灰度数组非法抛错', () => {
    expect(() => aHash(new Array<number>(100).fill(0))).toThrow(/灰度数据非法/)
    expect(() => aHash('nope' as unknown as number[])).toThrow(/灰度数据非法/)
  })
})

describe('dHash', () => {
  it('全黑图：相邻相等 → 全 0', () => {
    expect(dHash(blackGray())).toBe('0000000000000000')
  })

  it('左亮右暗渐变：左恒大于右 → 全 1', () => {
    expect(dHash(gradientGray())).toBe('ffffffffffffffff')
  })

  it('输出恒为 16 位 hex', () => {
    expect(dHash(halfGray())).toHaveLength(HASH_HEX_LENGTH)
  })

  it('灰度数组非法抛错', () => {
    expect(() => dHash(new Array<number>(10).fill(0))).toThrow(/灰度数据非法/)
  })
})

describe('dct2d', () => {
  it('常数矩阵：仅 DC 非零（已知值）', () => {
    const m = Array.from({ length: 32 }, () => new Array<number>(32).fill(100))
    const dct = dct2d(m)
    expect(dct[0][0]).toBe(100 * 32 * 32)
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (y === 0 && x === 0) continue
        expect(Math.abs(dct[y][x])).toBeLessThan(1e-6)
      }
    }
  })

  it('1×1 矩阵恒等', () => {
    expect(dct2d([[4]])).toEqual([[4]])
  })

  it('非方阵/空矩阵抛错', () => {
    expect(() => dct2d([])).toThrow(/DCT 输入非法/)
    expect(() => dct2d([[1, 2], [3]])).toThrow(/DCT 输入非法/)
    expect(() =>
      dct2d([
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    ).toThrow(/DCT 输入非法/)
    expect(() => dct2d([1, 2] as unknown as number[][])).toThrow(/DCT 输入非法/)
  })
})

describe('pHash', () => {
  it('全黑图：DCT 全零 → 全 0 哈希', () => {
    expect(pHash(blackGray())).toBe('0000000000000000')
  })

  it('不同内容哈希不同', () => {
    expect(pHash(halfGray())).not.toBe(pHash(blackGray()))
  })

  it('输出恒为 16 位 hex', () => {
    expect(pHash(gradientGray())).toHaveLength(HASH_HEX_LENGTH)
  })

  it('灰度数组非法抛错', () => {
    expect(() => pHash(new Array<number>(10).fill(0))).toThrow(/灰度数据非法/)
  })
})

describe('hammingDistance', () => {
  it('已知距离', () => {
    expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64)
    expect(hammingDistance('8000000000000000', '0000000000000000')).toBe(1)
    expect(hammingDistance('0123456789abcdef', '0123456789abcdef')).toBe(0)
  })

  it('长度非法抛错', () => {
    expect(() => hammingDistance('0'.repeat(15), '0'.repeat(16))).toThrow(/哈希非法/)
    expect(() => hammingDistance('0'.repeat(16), 'zz00000000000000')).toThrow(/哈希非法/)
  })
})

describe('similarityPercent / similarityText', () => {
  it('距离 0 → 100%，距离 64 → 0%', () => {
    expect(similarityPercent(0)).toBe(100)
    expect(similarityText(0)).toBe('100.0%')
    expect(similarityPercent(64)).toBe(0)
    expect(similarityText(64)).toBe('0.0%')
  })

  it('保留 1 位小数', () => {
    // 63/64×100 = 98.4375 → 98.4%
    expect(similarityText(1)).toBe('98.4%')
    expect(similarityText(32)).toBe('50.0%')
  })
})
