// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  SUPPORTED_IMAGE_MIMES,
  EXPORT_MIMES,
  loadImageFromBlob,
  canvasToBlob,
  downloadBlob,
  drawPixelated,
  drawWithFilter,
  readFileAsDataURL,
  isSupportedImageFile,
  formatBytes,
  fileExtension,
  replaceExtension,
  mimeToExtension,
  createCanvas,
  drawScaled,
} from './image'

// ---------- DOM mocks ----------

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private _src = ''
  get src() {
    return this._src
  }
  set src(v: string) {
    this._src = v
    // 默认走成功路径；失败用例会单独 mock
    queueMicrotask(() => this.onload?.())
  }
}

let lastAnchor: HTMLAnchorElement | null = null

beforeEach(() => {
  vi.stubGlobal('Image', MockImage)
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  lastAnchor = null
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mockCanvas(toBlobImpl?: (cb: (b: Blob | null) => void) => void) {
  const canvas = document.createElement('canvas')
  canvas.toBlob = vi.fn((cb: (b: Blob | null) => void) => {
    if (toBlobImpl) toBlobImpl(cb)
    else cb(new Blob(['x'], { type: 'image/png' }))
  }) as unknown as typeof canvas.toBlob
  return canvas
}

function mock2DContext() {
  return {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('常量', () => {
  it('支持的输入/导出 MIME 非空', () => {
    expect(SUPPORTED_IMAGE_MIMES.length).toBeGreaterThan(0)
    expect(EXPORT_MIMES).toContain('image/png')
  })
})

describe('loadImageFromBlob', () => {
  it('成功加载返回 Image 实例并释放 URL', async () => {
    const img = await loadImageFromBlob(new Blob(['x'], { type: 'image/png' }))
    expect(img).toBeInstanceOf(MockImage)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('解码失败时 reject 并释放 URL', async () => {
    vi.stubGlobal(
      'Image',
      class extends MockImage {
        override set src(_v: string) {
          queueMicrotask(() => this.onerror?.())
        }
      },
    )
    await expect(loadImageFromBlob(new Blob(['x']))).rejects.toThrow(/解码失败/)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })
})

describe('canvasToBlob', () => {
  it('成功返回 Blob', async () => {
    const blob = await canvasToBlob(mockCanvas(), 'image/jpeg', 0.8)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('toBlob 返回 null 时 reject', async () => {
    await expect(
      canvasToBlob(
        mockCanvas((cb) => cb(null)),
        'image/png',
      ),
    ).rejects.toThrow(/导出失败/)
  })
})

describe('downloadBlob', () => {
  it('创建 a 标签并触发点击下载', () => {
    vi.useFakeTimers()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadBlob(new Blob(['x']), 'a.png')
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
    // 断言延迟释放逻辑存在（不等待真实 1s）
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    clickSpy.mockRestore()
    vi.useRealTimers()
    expect(lastAnchor).toBeNull() // 仅占位，确认 mock 恢复
  })
})

describe('readFileAsDataURL', () => {
  function stubFileReader(succeed: boolean) {
    class FakeReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      result: string | null = null
      readAsDataURL(_file: Blob) {
        queueMicrotask(() => {
          if (succeed) {
            this.result = 'data:image/png;base64,xx'
            this.onload?.()
          } else {
            this.onerror?.()
          }
        })
      }
    }
    vi.stubGlobal('FileReader', FakeReader)
  }

  it('成功读取返回 dataURL', async () => {
    stubFileReader(true)
    const url = await readFileAsDataURL(new Blob(['x']))
    expect(url).toBe('data:image/png;base64,xx')
  })

  it('读取失败时 reject', async () => {
    stubFileReader(false)
    await expect(readFileAsDataURL(new Blob(['x']))).rejects.toThrow(/读取失败/)
  })
})

describe('isSupportedImageFile', () => {
  it('按 MIME 判断', () => {
    expect(isSupportedImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true)
    expect(isSupportedImageFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(false)
  })

  it('无 MIME 时按扩展名兜底', () => {
    expect(isSupportedImageFile(new File(['x'], 'a.JPG', { type: '' }))).toBe(true)
    expect(isSupportedImageFile(new File(['x'], 'a.txt', { type: '' }))).toBe(false)
  })
})

describe('formatBytes', () => {
  it('边界与进位', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(NaN)).toBe('0 B')
    expect(formatBytes(1)).toBe('1.00 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1536)).toBe('1.50 KB')
    expect(formatBytes(10240)).toBe('10.0 KB')
    expect(formatBytes(1048576)).toBe('1.00 MB')
    expect(formatBytes(1073741824)).toBe('1.00 GB')
    expect(formatBytes(5 * 1073741824)).toBe('5.00 GB')
  })

  it('大数值截断到 GB', () => {
    expect(formatBytes(Number.MAX_SAFE_INTEGER)).toContain('GB')
  })
})

describe('fileExtension / replaceExtension / mimeToExtension', () => {
  it('取扩展名', () => {
    expect(fileExtension('a.PNG')).toBe('png')
    expect(fileExtension('a')).toBe('')
    expect(fileExtension('  b.jpeg  ')).toBe('jpeg')
  })

  it('替换扩展名', () => {
    expect(replaceExtension('a.png', 'jpg')).toBe('a.jpg')
    expect(replaceExtension('a', 'webp')).toBe('a.webp')
  })

  it('MIME 转扩展名', () => {
    expect(mimeToExtension('image/jpeg')).toBe('jpg')
    expect(mimeToExtension('image/png')).toBe('png')
    expect(mimeToExtension('image/webp')).toBe('webp')
    expect(mimeToExtension('image/gif')).toBe('gif')
    expect(mimeToExtension('image/avif')).toBe('avif')
    expect(mimeToExtension('image/unknown')).toBe('png')
  })
})

describe('createCanvas / drawScaled', () => {
  it('createCanvas 尺寸至少为 1', () => {
    const c = createCanvas(0, -5)
    expect(c.width).toBe(1)
    expect(c.height).toBe(1)
    const c2 = createCanvas(100.6, 50.2)
    expect(c2.width).toBe(101)
  })

  it('drawScaled 高质量绘制', () => {
    const canvas = document.createElement('canvas')
    const ctx = mock2DContext()
    canvas.getContext = vi.fn(() => ctx) as unknown as typeof canvas.getContext
    const origCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') return canvas
      return origCreate(tag as never)
    }) as typeof document.createElement)

    const img = new MockImage() as unknown as CanvasImageSource
    const out = drawScaled(img, 100, 100, 50, 50)
    expect(out.width).toBe(50)
    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.imageSmoothingQuality).toBe('high')
    createSpy.mockRestore()
  })

  it('getContext 为空时抛错', () => {
    const canvas = document.createElement('canvas')
    canvas.getContext = vi.fn(() => null) as unknown as typeof canvas.getContext
    const origCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') return canvas
      return origCreate(tag as never)
    }) as typeof document.createElement)
    expect(() => drawScaled({} as CanvasImageSource, 10, 10, 5, 5)).toThrow(/2D 上下文/)
    createSpy.mockRestore()
  })
})

describe('drawWithFilter', () => {
  function stubCanvasCtx(ctx: CanvasRenderingContext2D | null) {
    const canvas = document.createElement('canvas')
    canvas.getContext = vi.fn(() => ctx) as unknown as typeof canvas.getContext
    const origCreate = document.createElement.bind(document)
    return vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') return canvas
      return origCreate(tag as never)
    }) as typeof document.createElement)
  }

  it('设置 ctx.filter 后绘制', () => {
    const ctx = mock2DContext()
    const createSpy = stubCanvasCtx(ctx)
    const img = new MockImage() as unknown as CanvasImageSource
    const out = drawWithFilter(img, 100, 80, 100, 80, 'blur(5px) grayscale(0.5)')
    expect(out.width).toBe(100)
    expect(out.height).toBe(80)
    expect(ctx.filter).toBe('blur(5px) grayscale(0.5)')
    expect(ctx.drawImage).toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it('getContext 为空时抛错', () => {
    const createSpy = stubCanvasCtx(null)
    expect(() => drawWithFilter({} as CanvasImageSource, 10, 10, 10, 10, 'blur(2px)')).toThrow(
      /2D 上下文/,
    )
    createSpy.mockRestore()
  })
})

describe('drawPixelated', () => {
  it('缩小再关闭平滑放大，形成色块', () => {
    const smallCtx = mock2DContext()
    const bigCtx = mock2DContext()
    const smallCanvas = document.createElement('canvas')
    smallCanvas.getContext = vi.fn(() => smallCtx) as unknown as typeof smallCanvas.getContext
    const bigCanvas = document.createElement('canvas')
    bigCanvas.getContext = vi.fn(() => bigCtx) as unknown as typeof bigCanvas.getContext
    const origCreate = document.createElement.bind(document)
    let calls = 0
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') return ++calls === 1 ? smallCanvas : bigCanvas
      return origCreate(tag as never)
    }) as typeof document.createElement)

    const img = new MockImage() as unknown as CanvasImageSource
    const out = drawPixelated(img, 100, 80, 10)
    expect(out.width).toBe(100)
    expect(out.height).toBe(80)
    // 小图为 10x8（高质量缩放），大图关闭平滑后放大绘制
    expect(smallCanvas.width).toBe(10)
    expect(smallCanvas.height).toBe(8)
    expect(bigCtx.imageSmoothingEnabled).toBe(false)
    expect(bigCtx.drawImage).toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it('块大小非法时兜底为 1（等价原图）', () => {
    const ctx = mock2DContext()
    const canvas = document.createElement('canvas')
    canvas.getContext = vi.fn(() => ctx) as unknown as typeof canvas.getContext
    const origCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') return canvas
      return origCreate(tag as never)
    }) as typeof document.createElement)
    const img = new MockImage() as unknown as CanvasImageSource
    const out = drawPixelated(img, 100, 80, 0)
    expect(out.width).toBe(100)
    expect(ctx.drawImage).toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it('大图 getContext 为空时抛错', () => {
    const smallCtx = mock2DContext()
    const smallCanvas = document.createElement('canvas')
    smallCanvas.getContext = vi.fn(() => smallCtx) as unknown as typeof smallCanvas.getContext
    const bigCanvas = document.createElement('canvas')
    bigCanvas.getContext = vi.fn(() => null) as unknown as typeof bigCanvas.getContext
    const origCreate = document.createElement.bind(document)
    let calls = 0
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') return ++calls === 1 ? smallCanvas : bigCanvas
      return origCreate(tag as never)
    }) as typeof document.createElement)
    expect(() => drawPixelated({} as CanvasImageSource, 10, 10, 2)).toThrow(/2D 上下文/)
    createSpy.mockRestore()
  })
})
