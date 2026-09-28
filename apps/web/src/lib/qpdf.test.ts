// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCallMain = vi.fn<(...args: unknown[]) => number>()
const mockWriteFile = vi.fn()
const mockReadFile = vi.fn<(...args: unknown[]) => Uint8Array>()
const mockUnlink = vi.fn()
const mockCreateModule = vi.fn()

let capturedLocateFile: (() => string) | null = null

vi.mock('@neslinesli93/qpdf-wasm', () => ({
  default: (...args: unknown[]) => mockCreateModule(...args),
}))

vi.mock('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url', () => ({
  default: 'mock-qpdf.wasm',
}))

import { errorMessage, getQpdfModule, runQpdf } from './qpdf'

function makeModule() {
  return {
    callMain: (...args: unknown[]) => mockCallMain(...args),
    FS: {
      writeFile: mockWriteFile,
      readFile: (...args: unknown[]) => mockReadFile(...args),
      unlink: mockUnlink,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // 注意：不重置 capturedLocateFile——getQpdfModule 是进程级单例，
  // 无论哪个测试先跑，首次初始化时都会捕获，后续测试复用同一捕获值
  mockCreateModule.mockImplementation((opts: { locateFile: () => string }) => {
    capturedLocateFile = opts.locateFile
    return Promise.resolve(makeModule())
  })
  mockCallMain.mockReturnValue(0)
  mockReadFile.mockReturnValue(new Uint8Array([1, 2, 3]))
})

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('getQpdfModule', () => {
  it('懒加载单例：多次调用只初始化一次', async () => {
    const a = await getQpdfModule()
    const b = await getQpdfModule()
    expect(mockCreateModule).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('locateFile 返回 wasm URL（与测试顺序无关）', async () => {
    await getQpdfModule()
    expect(capturedLocateFile).not.toBeNull()
    expect(capturedLocateFile!()).toBe('mock-qpdf.wasm')
  })
})

describe('runQpdf', () => {
  it('成功路径：写入输入、执行、读取输出、清理 FS', async () => {
    const input = new Uint8Array([9, 9])
    const out = await runQpdf(input, (inP, outP) => ['--decrypt', '--', inP, outP])
    expect(out).toEqual(new Uint8Array([1, 2, 3]))
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringMatching(/^\/qpdf-in-\d+\.pdf$/), input)
    expect(mockCallMain).toHaveBeenCalledWith([
      '--decrypt',
      '--',
      expect.stringMatching(/^\/qpdf-in-\d+\.pdf$/),
      expect.stringMatching(/^\/qpdf-out-\d+\.pdf$/),
    ])
    expect(mockUnlink).toHaveBeenCalledTimes(2)
  })

  it('连续调用使用唯一路径', async () => {
    await runQpdf(new Uint8Array([1]), (a, b) => [a, b])
    await runQpdf(new Uint8Array([2]), (a, b) => [a, b])
    const paths = mockWriteFile.mock.calls.map((c) => c[0] as string)
    expect(new Set(paths).size).toBe(2)
  })

  it('callMain 抛异常时转译错误', async () => {
    mockCallMain.mockImplementation(() => {
      throw new Error('boom')
    })
    await expect(runQpdf(new Uint8Array([1]), (a, b) => [a, b])).rejects.toThrow(
      /qpdf 执行异常：boom/,
    )
  })

  it('非零退出码时抛错', async () => {
    mockCallMain.mockReturnValue(2)
    await expect(runQpdf(new Uint8Array([1]), (a, b) => [a, b])).rejects.toThrow(
      /qpdf 执行失败（退出码 2）/,
    )
  })

  it('输出文件缺失时抛错', async () => {
    mockReadFile.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    await expect(runQpdf(new Uint8Array([1]), (a, b) => [a, b])).rejects.toThrow(
      /qpdf 未生成输出文件：ENOENT/,
    )
  })

  it('输出文件为空时抛错', async () => {
    mockReadFile.mockReturnValue(new Uint8Array(0))
    await expect(runQpdf(new Uint8Array([1]), (a, b) => [a, b])).rejects.toThrow(
      /qpdf 输出文件为空/,
    )
  })

  it('清理阶段 unlink 失败不影响主流程', async () => {
    mockUnlink.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    const out = await runQpdf(new Uint8Array([1]), (a, b) => [a, b])
    expect(out).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('失败时也会清理 FS 文件', async () => {
    mockCallMain.mockReturnValue(3)
    await expect(runQpdf(new Uint8Array([1]), (a, b) => [a, b])).rejects.toThrow()
    expect(mockUnlink).toHaveBeenCalledTimes(2)
  })
})
