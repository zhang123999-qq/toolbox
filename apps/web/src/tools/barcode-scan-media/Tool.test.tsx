// @vitest-environment jsdom
/**
 * barcode-scan-media 组件测试
 *
 * @zxing/browser 动态导入整体 mock：覆盖图片解码成功 / 未找到 / 其他错误、
 * 摄像头扫描成功 / 扫描中其他错误 / 组件加载失败分支。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

type DecodeOutcome =
  | { kind: 'ok'; text: string; format: string }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }

let imageOutcome: DecodeOutcome = { kind: 'ok', text: '6921234567890', format: 'EAN_13' }
let videoCallback: ((result: unknown, err: unknown) => void) | null = null
let readerShouldThrow = false
const resetCalls: ReturnType<typeof vi.fn>[] = []

function makeResult(text: string, format: string) {
  return {
    getText: () => text,
    getBarcodeFormat: () => ({ toString: () => format }),
  }
}

class MockReader {
  private resetSpy = vi.fn()
  constructor() {
    resetCalls.push(this.resetSpy)
  }
  async decodeFromImageUrl(_url: string) {
    if (readerShouldThrow) throw new Error('cdn down')
    if (imageOutcome.kind === 'ok') return makeResult(imageOutcome.text, imageOutcome.format)
    if (imageOutcome.kind === 'notFound') {
      const err = new Error('not found')
      err.name = 'NotFoundException'
      throw err
    }
    throw new Error(imageOutcome.message)
  }
  decodeFromVideoElement(_video: unknown, callback: (result: unknown, err: unknown) => void) {
    if (readerShouldThrow) throw new Error('cdn down')
    videoCallback = callback
  }
  reset() {
    this.resetSpy()
  }
}

vi.mock('@zxing/browser', () => ({ BrowserMultiFormatReader: MockReader }))

function stubBrowserApis(): void {
  imageOutcome = { kind: 'ok', text: '6921234567890', format: 'EAN_13' }
  videoCallback = null
  readerShouldThrow = false
  resetCalls.length = 0
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  })
}

beforeEach(stubBrowserApis)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function switchToImageMode(): void {
  const { container } = render(<Tool />)
  const select = container.querySelector('select')
  if (!select) throw new Error('缺少扫描来源下拉框')
  fireEvent.change(select, { target: { value: 'image' } })
}

describe('barcode-scan-media · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('scan-camera')).toBeTruthy()
    expect(byTestId('preview')).toBeTruthy()
  })

  it('图片模式：选择图片 → 显示条码格式与内容', async () => {
    switchToImageMode()
    const file = new File([new Uint8Array([1, 2, 3])], 'code.png', { type: 'image/png' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('一维条码（EAN-13，商品条码）')
    expect(info).toContain('6921234567890')
  })

  it('图片未含条码 → 中文提示', async () => {
    imageOutcome = { kind: 'notFound' }
    switchToImageMode()
    const file = new File([new Uint8Array([1, 2, 3])], 'blank.png', { type: 'image/png' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('未在画面中识别到条码')
  })

  it('图片解码其他错误 → 中文错误提示', async () => {
    imageOutcome = { kind: 'error', message: 'bad pixels' }
    switchToImageMode()
    const file = new File([new Uint8Array([1, 2, 3])], 'bad.png', { type: 'image/png' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('图片解码失败：bad pixels')
  })

  it('解码器内部抛错 → 中文提示解码失败', async () => {
    readerShouldThrow = true
    switchToImageMode()
    const file = new File([new Uint8Array([1, 2, 3])], 'code.png', { type: 'image/png' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('图片解码失败：cdn down')
  })

  it('摄像头模式：开始扫描 → 回调给结果 → 显示并停止', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('stop-scan')).toBeTruthy(), { timeout: 10000 })
    if (!videoCallback) throw new Error('摄像头扫描回调未注册')
    videoCallback(makeResult('hello-qr', 'QR_CODE'), undefined)
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('二维码（QR Code）')
    expect(byTestId('result-info').textContent).toContain('hello-qr')
    expect(byTestId('scan-camera')).toBeTruthy()
  })

  it('摄像头扫描中 NotFound 错误被忽略，继续扫描', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('stop-scan')).toBeTruthy(), { timeout: 10000 })
    if (!videoCallback) throw new Error('摄像头扫描回调未注册')
    const err = new Error('nope')
    err.name = 'NotFoundException'
    videoCallback(undefined, err)
    expect(byTestId('stop-scan')).toBeTruthy()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('摄像头扫描中其他错误 → 中文提示并停止', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('stop-scan')).toBeTruthy(), { timeout: 10000 })
    if (!videoCallback) throw new Error('摄像头扫描回调未注册')
    videoCallback(undefined, new Error('camera exploded'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('扫描出错：camera exploded')
  })

  it('手动停止扫描 → 回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('stop-scan')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('stop-scan'))
    expect(byTestId('scan-camera')).toBeTruthy()
  })
})
